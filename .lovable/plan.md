# Orçamento em créditos — REDE MULTPLICK

Nada foi alterado. Abaixo só a análise e a estimativa.

## O que já existe e será reaproveitado

- **Repasses**: `repasse_parceiros`, `repasse_contratos`, `repasse_parcelas` com triggers de fechamento (dia 27) / pagamento (dia 15), tela `AdminRepasses` e `RepasseSection`. A regra "comissão só sobre o efetivamente recebido" já é o comportamento do módulo — o Licenciado entra como um novo tipo de parceiro, não como sistema novo.
- **Afiliados**: `affiliates`, `affiliate_referrals`, metas/ranking (`affiliate_goals`, `affiliate_public_stats`) e portal isolado `Afiliado.tsx` — base direta do Portal do Licenciado e do link/`?ref` por Polo.
- **Pré-matrícula/matrícula**: `enrollment_applications`, `enrollments`, `installments`, `AdminPreMatriculas` (1.088 linhas) — reaproveitado inteiro no botão "+ Matricular novo aluno".
- **Marketing**: `mkt_assets`/`mkt_folders` + `MarketingArquivos` — só precisa de uma flag "Disponível para Licenciados" e uma tela de leitura no portal.
- **Alertas**: `UrgencyCenter`, `NotificationBell`, `notifications`, `InternalMessageAlert` (som + piscante já implementados) — só novos tipos de evento.
- **Permissões/auth**: enum `mod_*`, `role_definitions`, `user_permissions`, login numérico via `admin-create-user`.
- **Corporativo**: card "Licenciados e Parceiros" já existe marcado como "Em breve" — é só ligar a rota.
- **Pagamentos**: já há `create-payment`, `create-boleto` e `mp-webhook` (Mercado Pago) — o webhook InfinitePay copia esse padrão.

Faltam de fato: cadastro de Polos (tipo revendedor/licenciado, cidade/estado, taxa de adesão), tabela de regras por instituição/curso (custo interno, preço mínimo/sugerido, tipo de remuneração), ciclo de NF (envio até dia 14 + validação + bloqueio automático), painel Master da rede, portal do Licenciado e o planejamento financeiro de caixa.

## Estimativa por cenário

| Cenário | Mínimo | Máximo |
|---|---|---|
| A — Completo (tudo + InfinitePay + futuros) | 78 | 115 |
| B — Intermediário (operação completa + InfinitePay) | 48 | 68 |
| C — MVP essencial (sem InfinitePay) | 30 | 42 |
| D — MVP essencial + InfinitePay | 40 | 56 |

Com **63 créditos**, o seguro é o **Cenário D** (ou C, deixando folga). O B cabe no mínimo, mas estoura no cenário ruim.

### O que mais consome créditos
1. Portal do Licenciado (telas próprias + isolamento por RLS em cada consulta).
2. Ciclo de NF + planejamento financeiro (regras de data, bloqueio, estados).
3. Painel Master com filtros, ranking e agregações.
4. InfinitePay (webhook, conciliação, testes).
5. Recursos futuros (gamificação, QR, página regional, híbridos) — sozinhos somam 25–40.

### O que eu cortaria primeiro para caber em 63
Gamificação, Academia do Licenciado, página regional/QR Code, personalização de artes, Marketing Pro, turmas híbridas e B2B. Depois: ranking avançado e evolução mensal em gráfico (fica só número).

### Ordem recomendada (prompts pequenos)
1. Banco: tipos de Polo, regras por instituição/curso, NF no repasse (~6–8)
2. Cadastro de Polos + card Corporativo ativo (~4–6)
3. Painel Master + resumo no Dashboard (~6–8)
4. Portal do Licenciado (painel + matrícula reaproveitada) (~8–10)
5. Fechamento/NF/comprovante + planejamento financeiro (~7–9)
6. Criativos para Licenciados (flag + tela) (~3–4)
7. Alertas de Polo no UrgencyCenter/NotificationBell (~2–3)
8. InfinitePay checkout + webhook (~10–14)

### Risco de ultrapassar 63
- Cenário C: baixo (~10%)
- Cenário D: médio (~35%) — depende de retrabalho na homologação da InfinitePay
- Cenário B: alto (~60%)
- Cenário A: certo de ultrapassar

## InfinitePay isolado

| Item | Mínimo | Máximo |
|---|---|---|
| 7. Total InfinitePay (checkout + recorrência) | 16 | 24 |
| 8. Só checkout (link + `order_nsu` + webhook + baixa) | 10 | 14 |
| 9. Só recorrência (mensalidades) | 8 | 12 |
| 10. Checkout + recorrência | 16 | 24 |

A recorrência é mais barata se feita junto do checkout (compartilha webhook e conciliação); separada em outro momento custa ~3 a mais de retrabalho.

## Recomendação
Fazer o **Cenário C agora** (30–42) e decidir a InfinitePay depois com o saldo restante — assim você não fica sem crédito no meio do ciclo de fechamento.
