const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Stub: o envio real de e-mail exige configurar o domínio em Cloud → Emails.
  return json({ error: "O envio de e-mail ainda não está ativo. Configure o domínio de e-mail em Cloud → Emails e me avise para eu ativar o envio automático." }, 503);
});