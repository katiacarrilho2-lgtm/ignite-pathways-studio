# Corrigir o seletor de vendedor afiliado

**Custo estimado:** 0 crédito de geração.

## Diagnóstico confirmado
- O banco contém o afiliado ativo `Eva Educa mais · 021 · EVM2026`.
- A tela mostra apenas “Sem afiliado”, portanto o carregamento da relação afiliado/perfil está retornando vazio ou falhando silenciosamente no navegador.
- O salvamento já vincula a matrícula pelo identificador do afiliado e deve ser preservado.

## Correção mínima
1. Carregar os afiliados ativos e seus perfis em consultas separadas, evitando que uma falha na relação embutida esvazie todo o seletor.
2. Montar as opções no formato `Nome · login · código`, incluindo `Eva Educa mais · 021 · EVM2026`.
3. Exibir uma mensagem de erro caso a consulta falhe, em vez de aparentar que não existem afiliados.
4. Manter “Sem afiliado” como opção e, ao salvar, vincular todas as matrículas do aluno ao afiliado selecionado.
5. Validar no preview que a opção aparece, pode ser selecionada, permanece após salvar e atualiza `affiliate_id` na matrícula.

## Escopo
Somente o seletor e seu carregamento no cadastro do aluno; sem IA, imagens, novos módulos ou alterações visuais adicionais.
