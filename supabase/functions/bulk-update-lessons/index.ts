import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { courseId, updates } = await req.json();
    if (!courseId || !Array.isArray(updates)) {
      return new Response(JSON.stringify({ error: "courseId + updates[] required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    const { data: sections } = await supabase.from("course_sections").select("id").eq("course_id", courseId);
    const sectionIds = (sections ?? []).map((s: any) => s.id);
    let ok = 0, miss = 0;
    for (const u of updates) {
      const { data: lesson } = await supabase.from("course_lessons").select("id, content").in("section_id", sectionIds).eq("title", u.title).maybeSingle();
      if (!lesson) { miss++; continue; }
      const merged = { ...(lesson.content ?? {}), ...u.content };
      const { error } = await supabase.from("course_lessons").update({ content: merged }).eq("id", lesson.id);
      if (!error) ok++; else miss++;
    }
    return new Response(JSON.stringify({ ok, miss, total: updates.length }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});