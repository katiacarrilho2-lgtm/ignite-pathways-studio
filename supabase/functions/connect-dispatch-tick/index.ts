import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Roda a cada minuto via pg_cron. Pega mensagens pendentes vencidas,
 * envia via WhatsApp Cloud API (ou simula), atualiza status e contadores.
 */
const BATCH = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Carrega config do provedor
    const { data: cfg } = await admin
      .from('connect_api_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = cfg?.provider ?? 'simulado';
    const phoneNumberId = cfg?.phone_number_id;
    const cloudToken = Deno.env.get('WHATSAPP_CLOUD_TOKEN');

    // Garante campanhas agendadas com janela vencida → enviando
    await admin
      .from('connect_campaigns')
      .update({ status: 'enviando' })
      .eq('status', 'agendada');

    // Pega lote de pendentes vencidos
    const { data: queue, error: qErr } = await admin
      .from('connect_campaign_messages')
      .select('id, campaign_id, contact_id, mensagem, tentativas')
      .eq('status', 'pendente')
      .lte('agendada_para', new Date().toISOString())
      .order('agendada_para', { ascending: true })
      .limit(BATCH);
    if (qErr) throw qErr;
    if (!queue || queue.length === 0) {
      await finalizeCompleted(admin);
      return json({ ok: true, processed: 0 });
    }

    // Resolve contatos
    const contactIds = [...new Set(queue.map((m) => m.contact_id).filter(Boolean))];
    const { data: contacts } = await admin
      .from('connect_contacts')
      .select('id, whatsapp')
      .in('id', contactIds as string[]);
    const contactMap = new Map((contacts ?? []).map((c) => [c.id, c.whatsapp]));

    let sent = 0;
    let failed = 0;

    for (const msg of queue) {
      const phone = sanitizePhone(contactMap.get(msg.contact_id!) ?? '');
      if (!phone) {
        await admin.from('connect_campaign_messages').update({
          status: 'falhou',
          erro: 'Telefone inválido',
        }).eq('id', msg.id);
        failed += 1;
        continue;
      }

      try {
        if (provider === 'whatsapp_cloud') {
          if (!phoneNumberId || !cloudToken) throw new Error('WhatsApp Cloud não configurado');
          const wamid = await sendWhatsAppCloud(phoneNumberId, cloudToken, phone, msg.mensagem);
          await admin.from('connect_campaign_messages').update({
            status: 'enviada',
            enviada_em: new Date().toISOString(),
            whatsapp_message_id: wamid,
            tentativas: (msg.tentativas ?? 0) + 1,
          }).eq('id', msg.id);
        } else {
          // simulado
          await admin.from('connect_campaign_messages').update({
            status: 'simulada',
            enviada_em: new Date().toISOString(),
            tentativas: (msg.tentativas ?? 0) + 1,
          }).eq('id', msg.id);
        }
        sent += 1;
      } catch (e) {
        const tentativas = (msg.tentativas ?? 0) + 1;
        const willRetry = tentativas < 3;
        await admin.from('connect_campaign_messages').update({
          status: willRetry ? 'pendente' : 'falhou',
          erro: String((e as Error).message ?? e),
          tentativas,
          agendada_para: willRetry
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
            : undefined,
        }).eq('id', msg.id);
        if (!willRetry) failed += 1;
      }
    }

    // Atualiza contadores por campanha
    const campIds = [...new Set(queue.map((m) => m.campaign_id).filter(Boolean))] as string[];
    for (const cid of campIds) {
      const { count: enviadas } = await admin
        .from('connect_campaign_messages')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .in('status', ['enviada', 'simulada', 'entregue', 'lida']);
      const { count: falhas } = await admin
        .from('connect_campaign_messages')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .eq('status', 'falhou');
      await admin.from('connect_campaigns').update({
        total_enviadas: enviadas ?? 0,
        total_falhas: falhas ?? 0,
      }).eq('id', cid);
    }

    await finalizeCompleted(admin);
    return json({ ok: true, processed: queue.length, sent, failed });
  } catch (e) {
    console.error('dispatch-tick error', e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

async function finalizeCompleted(admin: any) {
  // Campanhas enviando sem nenhuma pendente → concluída
  const { data: running } = await admin
    .from('connect_campaigns')
    .select('id')
    .eq('status', 'enviando');
  for (const c of running ?? []) {
    const { count } = await admin
      .from('connect_campaign_messages')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', c.id)
      .eq('status', 'pendente');
    if ((count ?? 0) === 0) {
      await admin
        .from('connect_campaigns')
        .update({ status: 'concluida', concluido_em: new Date().toISOString() })
        .eq('id', c.id);
    }
  }
}

function sanitizePhone(p: string): string {
  return (p ?? '').replace(/\D/g, '');
}

async function sendWhatsAppCloud(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Cloud API ${res.status}: ${JSON.stringify(data?.error ?? data)}`);
  }
  return data?.messages?.[0]?.id ?? '';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}