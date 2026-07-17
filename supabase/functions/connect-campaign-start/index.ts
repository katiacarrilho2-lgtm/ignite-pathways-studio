import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Expande uma campanha em mensagens individuais agendadas na fila
 * (connect_campaign_messages). Respeita: tipo_publico, etiquetas,
 * recorrencia (única ou recorrente com dias_semana + horarios),
 * intervalo aleatório e pausa automática.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const { campaign_id } = await req.json();
    if (!campaign_id) return json({ error: 'campaign_id obrigatório' }, 400);

    const { data: camp, error: cErr } = await admin
      .from('connect_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .maybeSingle();
    if (cErr || !camp) return json({ error: 'Campanha não encontrada' }, 404);
    if (camp.status === 'enviando' || camp.status === 'agendada') {
      return json({ error: 'Campanha já está em execução' }, 409);
    }

    // Apaga fila antiga (se reenviar)
    await admin.from('connect_campaign_messages').delete().eq('campaign_id', campaign_id);

    // Carrega contatos-alvo
    let q = admin.from('connect_contacts').select('id, whatsapp, tags, tipo, opt_out');
    q = q.eq('opt_out', false);
    q = q.eq('tipo', camp.tipo_publico === 'grupo' ? 'grupo' : 'contato');
    const { data: contacts, error: ctErr } = await q;
    if (ctErr) return json({ error: ctErr.message }, 500);

    let alvos = contacts ?? [];
    if ((camp.etiquetas?.length ?? 0) > 0) {
      const tags: string[] = camp.etiquetas;
      alvos = alvos.filter((c: any) =>
        Array.isArray(c.tags) && c.tags.some((t: string) => tags.includes(t)),
      );
    }
    if (alvos.length === 0) {
      return json({ error: 'Nenhum destinatário encontrado para os filtros' }, 400);
    }

    // Carrega variantes (round-robin)
    const { data: variants } = await admin
      .from('connect_campaign_variants')
      .select('id, mensagem, ordem')
      .eq('campaign_id', campaign_id)
      .order('ordem');
    const variantsArr = (variants && variants.length > 0)
      ? variants
      : [{ id: null, mensagem: camp.mensagem, ordem: 0 }];

    // Calcula janelas de envio
    const windows = computeWindows(camp);
    if (windows.length === 0) {
      return json({ error: 'Nenhuma janela de envio válida (verifique dias/horários/datas)' }, 400);
    }

    // Distribui mensagens
    const intMin = Math.max(1, camp.intervalo_min ?? 30);
    const intMax = Math.max(intMin, camp.intervalo_max ?? 90);
    const pausaApos = Math.max(1, camp.pausa_apos_msgs ?? 20);
    const pausaMin = Math.max(0, camp.pausa_minutos ?? 10);

    const rows: any[] = [];
    let wi = 0;
    let cursor = new Date(windows[wi].getTime());
    let sentInWindow = 0;
    const windowEnd = (w: Date) => new Date(w.getTime() + 60 * 60 * 1000); // janela = 1h

    for (let i = 0; i < alvos.length; i++) {
      const v = variantsArr[i % variantsArr.length];
      const contact = alvos[i];

      // Aplica intervalo
      if (i > 0) {
        const delta = intMin + Math.floor(Math.random() * (intMax - intMin + 1));
        cursor = new Date(cursor.getTime() + delta * 1000);
      }
      // Pausa automática
      if (sentInWindow >= pausaApos) {
        cursor = new Date(cursor.getTime() + pausaMin * 60 * 1000);
        sentInWindow = 0;
      }
      // Se passou da janela atual, pula pra próxima
      while (cursor > windowEnd(windows[wi]) && wi + 1 < windows.length) {
        wi += 1;
        cursor = new Date(windows[wi].getTime());
        sentInWindow = 0;
      }

      rows.push({
        campaign_id,
        contact_id: contact.id,
        variant_id: v.id,
        mensagem: renderSpintax(v.mensagem),
        status: 'pendente',
        agendada_para: cursor.toISOString(),
      });
      sentInWindow += 1;
    }

    // Insere em lotes de 500
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error } = await admin.from('connect_campaign_messages').insert(slice);
      if (error) return json({ error: error.message }, 500);
    }

    await admin
      .from('connect_campaigns')
      .update({
        status: 'agendada',
        total_destinatarios: rows.length,
        total_enviadas: 0,
        total_falhas: 0,
        iniciado_em: new Date().toISOString(),
      })
      .eq('id', campaign_id);

    return json({ ok: true, queued: rows.length, windows: windows.length });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function renderSpintax(text: string): string {
  // {a|b|c} -> aleatório
  return (text ?? '').replace(/\{([^{}]+)\}/g, (_m, group: string) => {
    const opts = group.split('|');
    return opts[Math.floor(Math.random() * opts.length)];
  });
}

function computeWindows(camp: any): Date[] {
  const tz = 'America/Sao_Paulo'; // ignorado — usamos local server time (UTC offset assumido)
  void tz;
  const horarios: string[] = (camp.horarios?.length ? camp.horarios : ['09:00']);
  const start = camp.data_inicio ? new Date(camp.data_inicio + 'T00:00:00') : new Date();
  const end = camp.data_fim ? new Date(camp.data_fim + 'T23:59:59') : start;

  const out: Date[] = [];
  if (camp.recorrencia !== 'recorrente') {
    const [hh, mm] = (horarios[0] || '09:00').split(':').map(Number);
    const d = new Date(start);
    d.setHours(hh, mm, 0, 0);
    if (d < new Date()) d.setTime(Date.now() + 30 * 1000);
    out.push(d);
    return out;
  }

  const dias: number[] = camp.dias_semana?.length ? camp.dias_semana : [1, 2, 3, 4, 5];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (dias.includes(cursor.getDay())) {
      for (const h of horarios) {
        const [hh, mm] = h.split(':').map(Number);
        const d = new Date(cursor);
        d.setHours(hh, mm, 0, 0);
        if (d >= new Date()) out.push(d);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (out.length === 0) {
    // todas janelas no passado → enfileira em 30s
    out.push(new Date(Date.now() + 30 * 1000));
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}