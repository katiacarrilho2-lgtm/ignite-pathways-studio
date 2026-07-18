## Diagnóstico confirmado

O erro não foi resolvido porque a correção anterior ainda depende de campos/funções que não existem no banco atual:

- A função `admin-create-user` tenta consultar e gravar `profiles.username`, mas a tabela `profiles` atual só tem: `id`, `user_id`, `display_name`, `email`, `avatar_url`, `created_at`, `updated_at`.
- A função RPC `next_username` também não existe no banco atual.
- Por isso, quando a tela cria aluno sem informar usuário, o fallback não consegue calcular corretamente o próximo login numérico e acaba tentando reutilizar um login já existente, gerando erros como:
  - `Usuário deve ser numérico`
  - `A user with this email address has already been registered`
- Além disso, as telas `/admin/alunos`, `/admin/matriculas` e o hook de autenticação também consultam `profiles.username`, então a criação e listagem de alunos ficam quebradas enquanto essa coluna não existir.

## Plano de correção

1. **Ajustar o schema do banco**
   - Adicionar a coluna `username` em `profiles`.
   - Adicionar as colunas de perfil detalhado que a função já tenta salvar em `profiles`, ou ajustar a função para gravar detalhes em `student_profiles` conforme o schema atual.
   - Criar índice único para `profiles.username`, evitando duplicidade.
   - Criar a função `next_username()` para retornar o próximo login numérico disponível (`001`, `002`, `003`...).

2. **Corrigir a função `admin-create-user`**
   - Usar `next_username()` quando o admin não informar login.
   - Se o login gerado já existir no Auth, tentar o próximo número em vez de falhar.
   - Gravar dados básicos em `profiles` e dados de aluno em `student_profiles`, usando os nomes reais das colunas do banco (`rua`, `numero`, `bairro`, `cidade`, etc.).
   - Retornar erro claro apenas quando houver problema real de senha/permissão/dados.

3. **Corrigir usuários já existentes**
   - Preencher `profiles.username` para o super admin atual e qualquer aluno já criado, usando o prefixo do e-mail interno quando possível.
   - Garantir que `display_name` continue preservado.

4. **Deploy e validação**
   - Publicar novamente a Edge Function `admin-create-user`.
   - Testar a criação de aluno pela própria função.
   - Confirmar que `/admin/alunos` não retorna mais erro 400 em `profiles.username`.
   - Confirmar que um novo aluno recebe um login numérico e pode ser listado no admin.

## Resultado esperado

Depois da implementação, ao clicar em **Criar aluno**, o sistema deve gerar automaticamente um login como `002`, `003`, etc., salvar o aluno corretamente, listar na tela de alunos e permitir login com a senha definida.