# Controle de Repasses de Faculdades

Estimativa: **~6 a 8 créditos** (backend + 3 telas + integrações). Precisa do seu "ok" para começar.

## O que já existe (analisado)
- `enrollments` (aluno + curso + matrícula) e `installments` (parcelas: número, valor, desconto, valor final, vencimento, status, pago em).
- A tabela `partners` atual é só de logos do site — não serve para faculdade parceira, então crio um cadastro próprio.
- Nada de parcelas será duplicado: o repasse aponta para a parcela existente.

## Banco (novas tabelas)
1. `repasse_parceiros`: nome, percentual padrão (ex. 50), dia de fechamento (27), dia de pagamento (15), ativo.
2. `repasse_contratos`: 1 por matrícula que gera repasse — matrícula, parceiro, percentual aplicado, criado em.
3. `repasse_parcelas`: 1 por parcela existente — referência à parcela (`installment_id`, único), valor do aluno, valor de repasse, data prevista, status (a_receber / recebido / divergencia / cancelado), data recebida, valor recebido, diferença.

Automatismos no banco:
- Ao marcar "gera repasse = SIM", gera uma previsão para cada parcela da matrícula (1 se for à vista, 6 se 6, 12 se 12).
- Repasse por parcela = valor final da parcela × percentual.
- Data prevista calculada pela regra do parceiro: vencimento até o dia de fechamento → paga no dia de pagamento do mês seguinte; depois do fechamento → mês subsequente.
- Se a parcela mudar de valor ou vencimento, a previsão é recalculada — exceto as já marcadas como recebidas.
- Se marcar recebido com valor diferente do previsto, status vira "divergência" com a diferença calculada.

## Telas
1. **Matrícula/Aluno (`AdminAlunoEdit`)**: bloco "Esta matrícula gera repasse para a Multplick? NÃO / SIM" → escolhe faculdade (percentual/fechamento/pagamento preenchem sozinhos, percentual editável). Abaixo, a seção REPASSE com a tabela parcela a parcela e os totais (vendido, repasse, recebido, falta receber).
2. **Financeiro > Repasses** (nova rota `/admin/financeiro/repasses`):
   - Cards do mês: vendas vinculadas, repasse Multplick, recebido, a receber, atrasado, nº de alunos, nº de parcelas.
   - Filtros: mês, ano, faculdade, curso, aluno, status.
   - Tabela por aluno: curso, faculdade, qtd parcelas, valor da parcela, %, total vendido, total repasse, recebido, pendente, próximo recebimento, status. Clique abre as parcelas e o botão "Marcar como recebido" (data + valor recebido, com aviso de divergência).
   - Exportação em CSV usando o utilitário já existente.
3. **Aba de parceiros** dentro da mesma tela: cadastro de faculdade (nome, % padrão, dia fechamento, dia pagamento, ativo).

## Acesso
Restrito a quem já tem permissão de financeiro (`mod_financeiro`), com as políticas de segurança e permissões do banco no mesmo padrão do resto do sistema.
