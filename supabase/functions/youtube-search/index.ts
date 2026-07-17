import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

function parseISODuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

async function checkAuth(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: perms } = await admin.from("user_permissions")
    .select("permission").eq("user_id", user.id).eq("permission", "manage_courses");
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "super_admin");
  if ((perms ?? []).length === 0 && (roles ?? []).length === 0) return null;
  return user;
}

export type YoutubeResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  duration_seconds: number;
};

export async function searchYoutube(query: string, apiKey: string, maxResults = 10): Promise<YoutubeResult[]> {
  const q = query.trim();
  if (!q) return [];
  // search.list — ask only embeddable videos, region BR, prefer pt
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("maxResults", String(Math.min(20, Math.max(5, maxResults))));
  searchUrl.searchParams.set("relevanceLanguage", "pt");
  searchUrl.searchParams.set("regionCode", "BR");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("videoSyndicated", "true");
  searchUrl.searchParams.set("key", apiKey);

  const sr = await fetch(searchUrl.toString());
  if (!sr.ok) {
    const txt = await sr.text();
    throw new Error(`YouTube search ${sr.status}: ${txt.slice(0, 300)}`);
  }
  const sd = await sr.json();
  const ids = (sd.items ?? [])
    .map((it: any) => it?.id?.videoId)
    .filter((x: any) => typeof x === "string" && x.length > 0);
  if (ids.length === 0) return [];

  // videos.list — fetch duration + status
  const vUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  vUrl.searchParams.set("part", "snippet,contentDetails,status");
  vUrl.searchParams.set("id", ids.join(","));
  vUrl.searchParams.set("key", apiKey);
  const vr = await fetch(vUrl.toString());
  if (!vr.ok) {
    const txt = await vr.text();
    throw new Error(`YouTube videos ${vr.status}: ${txt.slice(0, 300)}`);
  }
  const vd = await vr.json();

  const out: YoutubeResult[] = [];
  for (const v of (vd.items ?? [])) {
    const dur = parseISODuration(v?.contentDetails?.duration ?? "PT0S");
    if (dur < 180) continue; // mínimo 3 min, exclui Shorts
    const st = v?.status ?? {};
    if (st.privacyStatus && st.privacyStatus !== "public") continue;
    if (st.embeddable === false) continue;
    if (st.uploadStatus && st.uploadStatus !== "processed") continue;
    const sn = v?.snippet ?? {};
    const thumb = sn?.thumbnails?.maxres?.url || sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || "";
    out.push({
      videoId: v.id,
      title: sn.title ?? "",
      channel: sn.channelTitle ?? "",
      thumbnail: thumb,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      duration_seconds: dur,
    });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await checkAuth(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const key = Deno.env.get("YOUTUBE_API_KEY");
    if (!key) return json({ error: "missing YOUTUBE_API_KEY" }, 500);
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "").trim();
    const maxResults = Number(body?.maxResults ?? 10);
    if (!query) return json({ error: "query obrigatório" }, 400);
    const results = await searchYoutube(query, key, maxResults);
    return json({ results });
  } catch (e: any) {
    console.error("youtube-search error:", e?.message ?? e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});