# Corrigir vendedores afiliados no cadastro do aluno

**Estimativa de execução:** cerca de 2 créditos.

## Objetivo
Fazer o campo de vendedor/afiliado mostrar somente afiliados válidos e identificá-los claramente pelo nome, login e código de afiliado.

## Implementação
1. Alterar o carregamento do cadastro do aluno para consultar diretamente os afiliados ativos junto aos respectivos perfis, em vez de usar a lista genérica de membros da equipe.
2. Exibir cada opção no formato `Nome · login · código`, por exemplo: `Eva Educa mais · 021 · EVM2026`.
3. Manter no cadastro do aluno o vínculo pelo usuário do vendedor e, ao salvar, vincular todas as matrículas desse aluno ao registro correto do afiliado.
4. Ajustar a tela de Afiliados para usar o mesmo padrão de identificação por nome e código nos seletores e relatórios.
5. Garantir que um vendedor cadastrado como afiliado apareça imediatamente nas opções, sem incluir administradores ou outros funcionários que não sejam afiliados.
6. Validar no preview o fluxo completo: abrir aluno, escolher afiliado pelo nome, salvar, recarregar e confirmar que o nome continua selecionado e que a matrícula recebeu o vínculo.

## Regra preservada
Quando uma parcela da matrícula vinculada for marcada como paga, a comissão continuará sendo gerada automaticamente pelo mecanismo já existente no banco.

## Detalhes técnicos
- A origem oficial do seletor será `affiliates` com o perfil associado.
- Apenas registros com status `ativo` serão oferecidos para novos vínculos.
- Não será criada comissão antecipada sem pagamento; o vínculo será salvo na matrícula e o cálculo ocorrerá sobre parcelas recebidas.
