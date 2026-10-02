# Corrigir professor virtual e assinatura do aluno

## Alterações
- Garantir que o botão do Professor Multplick fique sempre visível no player dos cursos, inclusive no celular e em cursos externos.
- Manter o chat ligado à aula atual e confirmar que o professor responde pela função já existente.
- Remover do certificado a assinatura cursiva gerada com o nome do aluno.
- Preservar apenas uma linha em branco, o nome impresso e o texto “Assinatura do(a) aluno(a)” para assinatura manual.

## Verificação
- Abrir um curso como aluno e confirmar a presença e abertura do professor virtual.
- Gerar um certificado de teste e conferir visualmente frente e verso, sem assinatura falsa.
- Conferir que o projeto continua sem erros.

## Detalhes técnicos
- Ajustar apenas o player do aluno, o componente do professor e o gerador atual de PDF; não alterar matrículas, notas ou emissão.
