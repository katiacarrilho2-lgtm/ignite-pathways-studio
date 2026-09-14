# Etapa 1 — Base de dados de vendas, avaliações e certificados (cursos livres)

Somente estrutura de banco e regras de acesso. Nada visual, nenhum pagamento novo, nenhum certificado emitido.

## O que será criado

1. **Pedidos** (`livre_orders`) — um pedido por compra de curso livre: comprador, curso, valor, situação (aguardando, pago, cancelado, reembolsado), origem/afiliado, vínculo opcional com a matrícula gerada.
2. **Pagamentos do pedido** (`livre_order_payments`) — registros de tentativa/confirmação de pagamento ligados ao pedido, com identificador externo (ex.: Mercado Pago), valor, método e situação. Não altera parcelas nem cobranças atuais.
3. **Banco de questões** (`exam_questions_bank`) — enunciado, alternativas, alternativa correta, explicação, dificuldade, tema, curso opcional.
4. **Configuração da avaliação** (`exam_configs`) — por curso: nota mínima, número de questões sorteadas, tempo, tentativas permitidas, embaralhamento, se libera certificado.
5. **Tentativas** (`exam_attempts`) — aluno, curso, início/fim, nota, aprovado/reprovado, número da tentativa.
6. **Respostas** (`exam_attempt_answers`) — resposta do aluno por questão e se acertou.
7. **Configuração do certificado** (`certificate_settings`) — dados institucionais e de assinatura, já preenchida com: Multplick Formação Profissional, CNPJ 37.541.371/0001-90, responsável Euclides Joaquim, cargo Coordenador.

## O que será reaproveitado (sem alterar)

- Alunos: `profiles`, `student_profiles`, `enrollments` — nenhuma base nova de alunos.
- Certificados: a tabela `certificates` atual continua sendo a única; recebe apenas campos novos opcionais (tipo, tentativa de origem, código de validação pública, situação, carga horária em horas, dados de cancelamento).
- Cursos: `courses` recebe apenas campos novos opcionais (tipo do curso, se vende como curso livre, se exige avaliação, se emite certificado automático).

## Regras aplicadas

- Todas as mudanças são aditivas: nenhum DROP, nenhuma renomeação, nenhum dado apagado.
- Certificação automática nasce **desativada** em todos os cursos atuais; só cursos marcados manualmente no futuro entram no novo fluxo.
- Tipos preparados: `curso_livre` e `avaliacao_conhecimentos`. Nada de "por competência", "MEC" ou "SISTEC".
- A resposta correta nunca fica acessível ao aluno: o banco de questões só é legível pela sede; o aluno enxerga questões apenas por função protegida do servidor, que devolve o enunciado e as alternativas sem indicar a correta.
- `create-payment` e `mp-webhook` não são tocados nesta etapa.

## Separação por conta (polo/licenciado)

Toda tabela nova recebe `account_id` com o mesmo padrão já usado em `enrollments` e `installments`: valor padrão pela conta do usuário logado, política restritiva de gravação e leitura limitada à própria conta. A sede (conta raiz) mantém a visão consolidada. Um polo nunca vê pedidos, pagamentos, tentativas ou certificados de outra conta.

Observação: `certificates` hoje **não** possui `account_id`. Será adicionado como campo opcional, preenchido a partir da matrícula correspondente, sem quebrar os registros existentes.

## Detalhes técnicos

- Uma migration aditiva única (`0012_cursos_livres_base.sql`): CREATE TABLE + GRANT + ENABLE RLS + POLICY, na ordem exigida; ALTER TABLE ADD COLUMN apenas com colunas anuláveis ou com DEFAULT.
- Índices: `livre_orders(account_id, status)`, `livre_order_payments(order_id)`, `exam_attempts(user_id, course_id)`, `exam_attempt_answers(attempt_id)`, único em `certificates(codigo_validacao)`.
- Funções `SECURITY DEFINER` criadas antes das políticas que as usam; reaproveita `has_permission`, `is_matriz_staff`, `account_visible`, `account_can_write`.
- Triggers de `updated_at` reaproveitando `update_updated_at_column()`.
- Auditoria: gatilho de registro em `audit_logs` nas mudanças de situação de pedido e na emissão/cancelamento de certificado, compatível com o `logAudit` do front.
- Tipos do backend regenerados ao final; sem alterações em telas.

## Custo estimado

3 a 4 créditos. Ao final: relatório completo e parada — a Etapa 2 não começa sozinha.
