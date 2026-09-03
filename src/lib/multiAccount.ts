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

/**
 * Injeta `account_id` quando a conta ativa é conhecida.
 * Quando não é, o campo é omitido de propósito: o banco aplica o DEFAULT
 * `public.current_account_id()`, que resolve a conta correta do usuário logado.
 * Nunca é possível gravar em outra conta — a policy RESTRICTIVE bloqueia.
 */
export function withAccount<T extends Record<string, any>>(
  payload: T,
  activeAccountId?: string | null,
): T {
  if (!payload || (payload as any).account_id) return payload;
  if (!activeAccountId) return payload;
  return { ...payload, account_id: activeAccountId };
}

/**
 * Versão para arrays de payloads.
 */
export function withAccountAll<T extends Record<string, any>>(
  payloads: T[],
  activeAccountId?: string | null,
): T[] {
  return payloads.map((p) => withAccount(p, activeAccountId));
}