import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { applicationId, courseTitle, extra } = await req.json();
    if (!applicationId || !courseTitle) {
      return new Response(JSON.stringify({ error: 'applicationId e courseTitle obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const prompt = `Você é um especialista em avaliações educacionais. Gere EXATAMENTE 30 questões de múltipla escolha sobre o curso: "${courseTitle}".${extra ? `\nDetalhes adicionais: ${extra}` : ''}

Regras:
- Cada questão tem 4 alternativas (A, B, C, D)
- Apenas UMA alternativa correta
- Questões de nível técnico, claras e objetivas
- Distribua os índices corretos entre as 4 alternativas

Responda APENAS um JSON válido no formato:
{"questions":[{"text":"...","options":["...","...","...","..."],"correct_index":0},...]}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI error', status: aiRes.status, detail: t }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 30) : [];
    if (questions.length < 10) {
      return new Response(JSON.stringify({ error: 'IA não retornou questões suficientes' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Remove provas anteriores não concluídas dessa pré-matrícula
    await supabase.from('enrollment_exams').delete().eq('application_id', applicationId).neq('status', 'completed');

    const { data: appRow } = await supabase
      .from('enrollment_applications')
      .select('full_name')
      .eq('id', applicationId)
      .maybeSingle();

    const { data: exam, error: examErr } = await supabase
      .from('enrollment_exams')
      .insert({
        application_id: applicationId,
        course_title: courseTitle,
        status: 'pending',
        candidate_name: appRow?.full_name ?? null,
      })
      .select()
      .single();
    if (examErr) throw examErr;

    const rows = questions.map((q: any, i: number) => ({
      exam_id: exam.id,
      position: i + 1,
      text: String(q.text ?? '').slice(0, 1000),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o).slice(0, 400)) : [],
      correct_index: Number.isInteger(q.correct_index) ? q.correct_index : 0,
    })).filter((r: any) => r.options.length === 4);

    const { error: qErr } = await supabase.from('enrollment_exam_questions').insert(rows);
    if (qErr) throw qErr;

    return new Response(JSON.stringify({ exam_id: exam.id, access_token: exam.access_token, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});