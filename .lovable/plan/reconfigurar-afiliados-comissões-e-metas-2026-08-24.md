# Reconfigurar afiliados, comissões e metas

**Custo estimado:** 0 crédito de geração. Serão usados apenas código, banco e testes do projeto.

## Diagnóstico confirmado
- Existe 1 afiliado ativo no banco: `Eva Educa mais · 021 · EVM2026`, com 1 matrícula vinculada.
- A tela administrativa ignora erros de carregamento e usa uma relação embutida; no estado mostrado, isso resulta em lista vazia e seletores contendo apenas “Sem afiliado”.
- A ficha do aluno já tenta vincular o afiliado às matrículas, mas guarda o vendedor por `user_id` e precisa preservar/carregar esse vínculo de forma consistente.
- O banco já possui um gatilho de comissão por parcela paga e a base atual é o valor final recebido após desconto, como solicitado.
- A área “Meu Afiliado” já lista comissões próprias e comprovantes, mas não mostra parcelas restantes, metas, estrelas, ranking ou comunicação do master.
- O CRM já restringe vendedores comuns aos próprios leads; o master vê todos. As metas atuais são globais, apenas diária/semanal/mensal e calculadas por valor recebido.
- A pré-matrícula já possui campo de código, mas o link do afiliado não o fixa na ficha. O módulo de cupons está em manutenção e não possui estrutura ativa no banco.

## 1. Corrigir o seletor e o vínculo do afiliado
- Carregar afiliados e perfis em consultas separadas tanto na ficha do aluno quanto na administração de afiliados, exibindo erros reais em vez de lista vazia.
- Mostrar sempre `Nome · login · código` e manter “Sem afiliado” como escolha explícita.
- Salvar o identificador do afiliado diretamente em todas as matrículas selecionadas do aluno e recarregar o valor persistido.
- Ao adicionar um novo curso ao aluno, herdar o afiliado já escolhido, evitando matrícula nova sem vínculo.
- Ajustar as permissões para que quem administra afiliados consiga ler e editar os dados necessários, sem ampliar acesso a usuários comuns.

## 2. Comissão sobre cada recebimento
- Preservar a regra escolhida: `comissão = valor efetivamente pago após desconto × percentual do afiliado`.
- Gerar uma comissão individual para cada parcela marcada como paga, inclusive pagamento integral representado por parcela única.
- Tornar o processamento idempotente: a mesma parcela não poderá gerar comissão duplicada ao ser editada ou marcada novamente.
- Preencher nome do aluno, curso, número da parcela e valor recebido no lançamento.
- Corrigir lançamentos antigos incompletos vinculáveis e manter separado o status do recebimento do aluno do status de pagamento da comissão ao afiliado.
- Exibir parcelas restantes da matrícula sem revelar dados de outros afiliados.

## 3. Pré-matrícula e código de indicação
- Gerar, na área do afiliado, links por curso no formato de pré-matrícula com o código do afiliado fixado.
- Ler o código do link, validar no banco, preencher o campo como bloqueado e gravá-lo na pré-matrícula.
- Ao o master converter a pré-matrícula em aluno/matrícula, mostrar claramente `Nome · login · código` e aplicar automaticamente o afiliado correto.
- Manter o cupom somente como identificação da indicação, sem desconto, conforme escolhido.
- Reativar “Cupons” como gestão dos códigos de afiliado: busca, status, link por curso e cópia/compartilhamento, sem criar um segundo código conflitante.

## 4. Portal dinâmico do afiliado
- Organizar “Meu Afiliado” em painel com resumo, indicações, recebimentos/comissões, parcelas restantes, metas, ranking e mensagens.
- Mostrar somente os próprios alunos, próprias comissões, comprovantes autorizados e parcelas vinculadas às próprias matrículas.
- Exibir percentual contratado, valor recebido, comissão calculada, aluno, curso, parcela/integral, situação e comprovante.
- Dar acesso ao CRM da equipe, mas o afiliado só poderá consultar e trabalhar leads cujo `owner_id` seja o próprio usuário; o master continuará vendo tudo.

## 5. Metas, estrelas e prêmio
- Criar metas por afiliado nos períodos diário, semanal, quinzenal e mensal, medidas por **matrículas com primeiro pagamento confirmado**.
- Permitir ao master criar/editar metas e seus prêmios; afiliados apenas visualizam o próprio progresso.
- Conceder 1 estrela a cada 5 matrículas pagas, derivada dos pagamentos confirmados para não permitir manipulação manual.
- Criar o marco da 30ª matrícula com prêmio editável pelo master e visível a todos.
- Criar ranking compartilhado exibindo somente nome, estrelas e quantidade de matrículas pagas, sem valores financeiros individuais.

## 6. Comunicação e segurança
- Permitir ao master enviar mensagens individuais ou gerais aos afiliados; cada afiliado vê apenas as mensagens destinadas a ele ou a todos.
- Proteger tabelas novas com permissões de banco: master gerencia; afiliado lê apenas dados próprios; ranking expõe somente os campos públicos definidos.
- Não expor CPF, e-mail, telefone, endereço, credenciais ou valores de comissão de outros vendedores.

## Validação obrigatória
- Entrar como master, confirmar que `Eva Educa mais · 021 · EVM2026` aparece, selecionar na ficha, salvar e verificar o vínculo persistido.
- Criar uma parcela com desconto, marcá-la como paga e confirmar uma única comissão sobre o valor final recebido.
- Testar pagamento integral e parcelado, reedição de parcela e ausência de duplicidade.
- Abrir o portal como afiliado e confirmar nome do aluno, parcela, restantes, comissão, comprovante, metas, ranking e mensagens.
- Testar link de pré-matrícula com código fixado e conversão pelo master.
- Confirmar que o afiliado não acessa leads, pagamentos, anexos, metas privadas ou mensagens de outro afiliado; o master deve continuar vendo e editando tudo.

## Detalhes técnicos
- Alterações de estrutura serão aplicadas por migração com `GRANT`, RLS e políticas na mesma operação.
- O gatilho de pagamento será ajustado sem antecipar comissão no cadastro: comissão só nasce quando houver recebimento confirmado.
- A implementação reutilizará as tabelas e telas atuais sempre que possível, adicionando apenas a estrutura necessária para metas/prêmios e mensagens de afiliados.
