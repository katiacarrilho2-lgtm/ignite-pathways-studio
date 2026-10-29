# Auditoria: Espaço do Licenciado (somente leitura)

Nada foi alterado. Diagnóstico com base em rotas, telas e regras de acesso do banco. Os fluxos não foram testados entrando como licenciado.

## 1. O que já existe
Sim, existe um Espaço do Licenciado: o **Portal do Polo** em `/polo` (`src/components/polo/PoloLayout.tsx`), separado do painel da matriz `/admin`.

Menu do polo (cada item aparece só se o usuário tiver a permissão `mod_*`): Dashboard, Agenda, CRM, Leads, Pré-matrículas, Afiliados, Turmas, Chamada, Pedagogia, Financeiro, Relatórios, Usuários/Equipe, Links de Documentos, Mensagens, Suporte, Criativos, Treinamentos, Escola Física, Almoxarifado, Solicitações, Documentos internos, Secretaria, Matrículas.

Lado da matriz (`/admin/licenciados`, apenas master da rede):
- `AdminLicenciados.tsx` — cadastro de unidades (`contas_comerciais`), cria o login do responsável e as permissões
- `AdminLicenciadoDetalhe.tsx` — números por unidade (`rede_stats`, `rede_equipe`)
- `AdminRedeMatriculas.tsx` — fila de pré-matrículas enviadas pelos polos, com aprovar/devolver (`rede_fila_pre_matriculas`, `rede_review_pre_matricula`)
- `AdminRegrasComerciais.tsx` — preço mínimo/sugerido e regra (percentual do licenciado ou valor fixo para a Multplick) por curso/categoria (`polo_regras`)
- `AdminRedeSuporte.tsx` — chamados de todos os polos (`rede_suporte`)
- `AdminRepasses.tsx` (`/admin/financeiro/repasses`) — repasse a parceiros (`repasse_parceiros/contratos/parcelas`)

## 2. Situação dos fluxos
| Fluxo | Situação |
|---|---|
| Login do licenciado | Completo (login numérico criado pela matriz, com permissões) |
| Dashboard do polo | Completo (o mesmo dashboard, filtrado pela unidade) |
| Pré-matrícula → envio à matriz → aprovar/devolver | Completo (gatilhos `network_pre_matricula_*`, reenvio `polo_reenviar_pre_matricula`) |
| Matrícula | Parcial: só a matriz efetiva; o polo vê as matrículas da própria unidade |
| Certificados | Só na matriz; o polo não tem menu de certificação (correto para o modelo) |
| Financeiro do polo | Parcial: lançamentos e parcelas da própria unidade; resumo `polo_resumo_comercial` existe |
| Repasse do licenciado à Multplick | **Lacuna**: `AdminRepasses` trata repasse a *parceiros/faculdades*, não cobra o polo. Não há tela que mostre ao licenciado "quanto devo por matrícula" nem baixa desse repasse |
| Regras comerciais visíveis ao polo | Parcial: a função `polo_regras_visiveis` existe, mas não há tela no portal do polo usando-a |
| Materiais de divulgação | Completo: `/polo/criativos` (`PoloCriativos.tsx`, materiais liberados do Marketing) |
| Suporte | Completo: polo abre chamado em `/polo/suporte`, matriz vê em `/admin/licenciados/suporte` |

## 3. Isolamento de dados
- Portal distinto por perfil: sim (`/polo` x `/admin`, menu por permissão).
- Isolamento: as principais tabelas (leads, CRM, pré-matrículas, matrículas, parcelas, financeiro, turmas, alunos, suporte, afiliados etc.) têm uma regra **restritiva** `account_visible(account_id)` — um polo não enxerga dados de outro, mesmo com permissão. Isso está correto.
- Pontos de atenção: as tabelas de repasse não têm essa regra por unidade (hoje só o financeiro da matriz acessa — seguro, porém o polo não vê o próprio repasse). `certificates` não tem regra por unidade, mas o polo não tem tela para eles.
- Persistem os 3 alertas de segurança antigos (tabela de teste aberta e uma pasta de imagens).

## 4. Comparação com o modelo comercial
- Adesão gratuita: compatível (não há cobrança de adesão no sistema).
- Licenciado recebe do aluno: compatível (financeiro próprio do polo).
- Repasse fixo por matrícula: o tipo de regra "Valor fixo da Multplick" já existe em `polo_regras`; os valores (Técnico/Competência R$450, EJA R$350, Graduação R$1.600, Tecnólogo R$1.100, Profissionalizante 50%) podem ser cadastrados ali, sem aparecer no site. Falta só **calcular e mostrar** o repasse devido por matrícula aprovada.

## 5. Melhorias pequenas sugeridas (sem duplicar)
1. Tela "Minhas regras e repasses" no portal do polo, usando `polo_regras_visiveis` + `polo_resumo_comercial` (mostra o que o licenciado deve por matrícula e o total do mês). ~1 crédito.
2. Na fila da matriz (`AdminRedeMatriculas`), coluna "repasse devido" e marcação "repasse recebido". ~1 crédito, inclui pequeno ajuste no banco.
3. Cadastrar os 5 valores nas Regras Comerciais (posso fazer ou você faz pelo painel). ~0,2 crédito.
4. Corrigir os 3 alertas de segurança antigos. ~0,5 crédito.

## Perguntas antes de qualquer alteração
- Quer seguir com alguma das melhorias 1–4? Quais?
- O repasse é devido quando a matriz **aprova** a matrícula ou quando o aluno **paga**?
- "Profissionalizantes 50%" é sobre o valor que o licenciado cobra ou sobre o preço de tabela?
