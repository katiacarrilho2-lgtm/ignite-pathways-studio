## O que registrar

Preferência do usuário, aplicada a partir de agora em toda demanda deste projeto:

> Antes de executar qualquer tarefa que consuma créditos (build mode, migrações, edge functions, geração de conteúdo, imagens, etc.), **eu apresento a estimativa de custo em créditos e aguardo o "ok" antes de rodar**.

## Passos

1. Criar `mem://preferences/credit-estimate-first.md` com a regra e o "como aplicar":
   - Sempre estimar faixa (ex.: 3–6 créditos) baseada em: nº de arquivos tocados, migrações SQL, funções deployadas, chamadas de IA.
   - Nunca iniciar execução sem confirmação quando a estimativa passar de ~2 créditos.
   - Para correções pequenas (1 arquivo, sem IA/migração), avisar mesmo assim e seguir.
2. Adicionar linha em `mem://index.md` na seção **Core** (regra universal do projeto) apontando para o arquivo acima.

## Custo deste passo

- 0 créditos de execução: são só 2 escritas de memória, sem código, sem migração, sem IA.

Aprovando, salvo a preferência e sigo aplicando daqui em diante.
