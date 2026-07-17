import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Webhook público chamado pela Meta para entregar status (sent/delivered/read/failed)
 * e mensagens recebidas. Deve ser exposto sem JWT.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);

  // Verificação inicial da Meta (GET com hub.challenge)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const verify = url.searchParams.get('hub.verify_token');
    const expected = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && verify === expected && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const payload = await req.json();
    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const v = change?.value ?? {};
        for (const st of v.statuses ?? []) {
          const wamid = st.id;
          const map: Record<string, string> = {
            sent: 'enviada',
            delivered: 'entregue',
            read: 'lida',
            failed: 'falhou',
          };
          const newStatus = map[st.status];
          if (!newStatus || !wamid) continue;
          const patch: any = { status: newStatus };
          if (newStatus === 'entregue') patch.entregue_em = new Date().toISOString();
          if (newStatus === 'lida') patch.lida_em = new Date().toISOString();
          if (newStatus === 'falhou') patch.erro = JSON.stringify(st.errors ?? {});
          await admin
            .from('connect_campaign_messages')
            .update(patch)
            .eq('whatsapp_message_id', wamid);
        }
        // (futuro) mensagens recebidas em v.messages → criar inbox
      }
    }
    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('webhook error', e);
    return new Response('err', { status: 200, headers: corsHeaders });
  }
});