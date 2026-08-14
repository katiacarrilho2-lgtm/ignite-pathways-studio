# Correções do site + 6 módulos da plataforma

## 1. Site desconfigurado (home)
Na imagem enviada: o card do curso PMOC aparece sem imagem (só o texto "PMOC" quebrado) e no card NR-10 a faixa amarela do WhatsApp cobre a etiqueta da categoria.

- Adicionar fallback de imagem no card de curso: se a imagem falhar ao carregar, mostra a capa padrão em vez do ícone quebrado.
- Reposicionar a faixa "Desconto especial" para o rodapé da imagem, sem sobrepor a etiqueta da categoria.
- Padronizar a altura dos cards para as 3 colunas ficarem alinhadas.

## 2. Bug da Equipe (CRM)
Hoje a aba Equipe lista todos os perfis (inclusive alunos), porque a consulta busca a tabela de perfis inteira.

- Passar a listar só quem é da equipe: usuários com cargo (master, admin, coordenador, editor, vendedor) ou com permissão de leads.
- Mostrar o cargo real ao lado do nome, no lugar do "User" genérico.
- O botão "Adicionar vendedor" continua promovendo um usuário comum a membro da equipe.

## 3. Carrossel Home (reativar)
A tabela do banner promocional já existe no banco; a tela está como stub.

- Reconstruir `/admin/promo`: criar/editar/excluir banner, upload da arte, título, subtítulo, link de destino, ordem e ativo/inativo.
- Reativar o carrossel na home (autoplay, setas, indicadores, responsivo).

**Medidas recomendadas para as artes**
- Desktop: **1920 × 720 px** (proporção 8:3)
- Mobile (campo separado, opcional): **1080 × 1350 px** (4:5)
- JPG ou PNG, até 500 KB, com o texto importante centralizado e margem de 10% nas bordas (as laterais são cortadas em telas menores).

## 4. Mensagens (reativar)
Canal aluno ↔ escola.

- Nova tabela de mensagens com conversas por aluno e respostas (autor, data, lida/não lida).
- Aluno em `/aluno/mensagens`: abre conversa, escreve a dúvida, vê as respostas.
- Admin em `/admin/mensagens`: caixa de entrada com lista de alunos, contador de não lidas e campo de resposta.

## 5. Relatórios para download
- **Financeiro**: relatório completo em CSV/Excel com nome do aluno, telefone, e-mail, curso e cada parcela (número, valor, vencimento, status pago/pendente/atrasado, data do pagamento, forma e desconto), com totais.
- Botão "Exportar" também em Alunos, Pré-matrículas, Matrículas, Turmas, Leads, Afiliados, Suporte e Certificação — exportando as colunas e filtros da tela.

## 6. Afiliados — comissão por parcela recebida + comprovante
- Quando uma parcela do aluno é marcada como paga, gerar automaticamente a comissão proporcional do afiliado (percentual sobre o valor recebido), identificando aluno, curso e número da parcela.
- Painel do afiliado: lista "a receber" e "recebido" detalhada por venda/parcela.
- Painel admin: marcar comissão como paga e anexar o **comprovante de pagamento** (PDF/imagem); o afiliado vê o comprovante na aba dele.

## 7. Links de Documentos — envio de documentos do aluno
- Lista exigida pela faculdade: RG, CPF, Comprovante de residência, Reservista, Certidão de nascimento ou casamento, Foto 3x4, Histórico escolar, Diploma do Ensino Médio e Outros.
- Aluno anexa cada documento, com aviso claro: **preferencialmente em PDF, legível, até 10 MB — acelera a autorização**.
- Admin vê o status de cada documento (pendente/enviado/aprovado/rejeitado), baixa individualmente ou baixa tudo em um pacote para enviar à faculdade.

## Detalhes técnicos
- Novas tabelas: mensagens (conversa + itens) e comissões por parcela; novos campos de comprovante no repasse ao afiliado. Regras de acesso: aluno vê só o dele, equipe vê tudo.
- Buckets privados para comprovantes de pagamento e documentos do aluno, com links assinados.
- Gatilho no banco para gerar a comissão quando a parcela passa para "pago".
- Exportação CSV feita no front, reaproveitando o padrão já usado no Relatório de pagamentos.
- Reaproveita o fluxo de documentos já existente (`DocumentosUpload`) adaptado à nova lista.

## Custo estimado
Nenhuma geração por IA (sem imagens ou textos gerados). Trabalho técnico estimado em **~6 a 8 créditos no total**, em 4 entregas:
1. Site + Equipe (~1)
2. Carrossel + Mensagens (~2)
3. Relatórios nas listagens (~2)
4. Afiliados + Documentos (~2 a 3)

Posso executar tudo em sequência ou entrega por entrega, como preferir.