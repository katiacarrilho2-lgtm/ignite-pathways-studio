## Objetivo

1. Corrigir o erro ao dar desconto e salvar uma parcela em **Alunos → detalhe do recebimento**.
2. Fazer uma auditoria leitura-apenas de **todas as abas do menu admin** e entregar um relatório com o status de cada uma, com estimativa de créditos por item — sem religar nada ainda. Você decide o que autorizar depois.

## Etapa 1 — Corrigir o bug do desconto na parcela

Passos:
- Reproduzir o fluxo em Alunos → aluno → Financeiro → parcela → registrar pagamento com desconto e capturar a mensagem exata de erro (console + resposta do backend).
- Investigar `src/pages/admin/AdminAlunoEdit.tsx` e componentes relacionados à tabela `installments` (campos usados no update: `paid_amount`, `discount_amount`, `status`, `paid_at`).
- Comparar com o schema real de `public.installments` no banco (colunas existentes, tipos, RLS).
- Causas prováveis: coluna `discount_amount` inexistente na tabela, RLS bloqueando o update, ou valor sendo enviado como string em vez de número.
- Aplicar a correção mínima: ou ajustar o payload no frontend, ou adicionar a coluna/policy que faltar via migration (uma única migration bem focada).
- Validar: efetuar o pagamento com desconto e confirmar que a parcela salva e reaparece na lista com status `pago`.

Escopo restrito: **só** o fluxo de recebimento/desconto de parcela. Nada de mexer em outras telas nesta etapa.

## Etapa 2 — Auditoria das abas do admin (somente leitura)

Vou percorrer cada rota do menu lateral e classificar em uma destas categorias:

- **OK** — funciona
- **STUB** — está com "Módulo em manutenção" no código (arquivo é um placeholder)
- **FALTA TABELA/COLUNA** — página existe mas backend não tem o schema
- **FALTA GRANT/RLS** — backend existe mas está bloqueado por permissão
- **BUG DE CÓDIGO** — precisa correção pontual

Abas a auditar (baseadas nos prints e no menu):

```text
Dashboard                    Certificação / Documentação Conselhos
Links de Documentos          CRM
Multplick Connect            Cursos
Gerar Curso IA               Corporativo
Categorias                   Andamento
Imagens                      Carrossel Home
Parceiros                    Cupons
Marketing IA                 Alunos
Pré-matrículas               Turmas
Usuários                     Cargos
Leads                        Mensagens
Suporte                      Financeiro
Relatórios                   Afiliados
Meu Afiliado                 Treinamentos
```

Para cada aba vou verificar:
- Se o arquivo em `src/pages/admin/` é um stub de "manutenção" ou é a implementação real.
- Se as tabelas que a página consulta existem no banco (comparando `useful-context` com o código).
- Se há GRANT/RLS bloqueando.

Entrego um relatório em formato de tabela na próxima resposta, com:
- Status por aba
- O que falta pra religar
- Estimativa de créditos para religar cada uma (baixo / médio / alto)
- Sugestão de ordem (o que dá mais valor primeiro, o que é dependência de outros)

## O que NÃO farei nesta etapa

- Não vou religar módulos em manutenção agora.
- Não vou gerar imagens, conteúdo de curso ou usar IA.
- Não vou mexer em CRM, Connect, cursos, corporativo, marketing IA — só leitura.

## Estimativa

- Etapa 1 (bug do desconto): ~1–2 créditos.
- Etapa 2 (auditoria + relatório): ~2–3 créditos.
- **Total esperado: 3–5 créditos.**

Depois do relatório, você escolhe item por item o que autorizar religar e eu estimo cada um antes de executar.
