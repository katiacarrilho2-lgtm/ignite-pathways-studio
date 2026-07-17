/**
 * Fase 1.2 — Etapa C6.1
 * Helper de injeção obrigatória de `account_id` em INSERTs do painel admin.
 *
 * Uso:
 *   const { activeAccountId } = useCommercialAccounts();
 *   await supabase.from("foo").insert(withAccount(payload, activeAccountId));
 *
 * Regras:
 *  - Nunca sobrescreve `account_id` já definido no payload.
 *  - Se nenhum activeAccountId estiver disponível, usa a conta raiz
 *    Multplick Oficial (mesma usada nos backfills C4.x/C5.x).
 *  - Não altera estrutura, RLS, triggers nem Edge Functions.
 */

export const ROOT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";

export function resolveAccountId(activeAccountId?: string | null): string {
  return activeAccountId || ROOT_ACCOUNT_ID;
}

export function withAccount<T extends Record<string, any>>(
  payload: T,
  activeAccountId?: string | null,
): T & { account_id: string } {
  if (payload && (payload as any).account_id) {
    return payload as T & { account_id: string };
  }
  return { ...payload, account_id: resolveAccountId(activeAccountId) };
}

/**
 * Versão para arrays de payloads.
 */
export function withAccountAll<T extends Record<string, any>>(
  payloads: T[],
  activeAccountId?: string | null,
): Array<T & { account_id: string }> {
  return payloads.map((p) => withAccount(p, activeAccountId));
}