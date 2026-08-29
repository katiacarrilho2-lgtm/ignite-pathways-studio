# Trocar as páginas de cursos técnicos para o novo parceiro (Colégio Técnico Universal)

## Estimativa de custo
Cerca de **2 a 3 créditos** (duas páginas reescritas, sem geração de imagem e sem mudanças no banco). Aguardo seu "ok".

## O que muda

Substituir todo o conteúdo institucional GlobalTec das duas páginas do site pelas informações do Colégio Técnico Universal, mantendo o layout, o design e os fluxos atuais (WhatsApp da Multplick, botão de pré-matrícula, banners de campanha). Nenhum link levará o aluno para o site do parceiro.

### Página "Técnico por Competência" (`/cursos/tecnico-por-competencia`)
- Faixa da certificadora: passa a ser "Colégio Técnico Universal", com o texto de credenciamento CEE/PA (Parecer Técnico CEE nº 412/2022) e cadastro SISTEC-MEC.
- Diferenciais: reconhecimento CEE/PA, certificação nacional, LDB Art. 41, diploma em até 48h, aceito pelos conselhos.
- Catálogo de cursos reorganizado nas 6 áreas do parceiro: Saúde (4), Tecnologia (3), Administração (5), Indústria & Automação (4), Construção Civil (2), Serviços & Meio Ambiente (3).
- Nova seção "Regulamentação & Validade Nacional" (CEE/PA, DOU, LDB Art. 41, SISTEC).
- Conselhos reconhecedores atualizados: COREN, CFT, CREA, CRA, CRQ, COFECI.
- FAQ reescrito com as 6 perguntas do parceiro, respondidas com o conteúdo correspondente.

### Página "Técnico Regular" (`/cursos/tecnico-regular`)
- Mesma troca de certificadora, diferenciais (100% EAD, professores especializados, suporte acadêmico) e mesmo catálogo de 6 áreas.
- Planos: **12 meses R$ 147,90/mês** e **18 meses R$ 119,90/mês** (destaque "Melhor custo-benefício"), com as listas de benefícios do parceiro (sem taxa de matrícula, diploma sem custo, tutoria etc.).
- Modalidade passa a ser 100% EAD (a página atual diz "20% presencial") — ajusto FAQ e diferenciais de acordo.
- Nova seção de regulamentação igual à da outra página.

## Detalhes técnicos
- Arquivos afetados: `src/pages/CursoPorCompetencia.tsx` e `src/pages/CursoRegular.tsx`.
- Rotas, navbar e componentes (`PageHero`, `CampaignBanner`) permanecem iguais.
- A logo GlobalTec (`globaltec-logo.webp`) sai; enquanto não houver logo do parceiro, uso um selo tipográfico "Colégio Técnico Universal" com a paleta atual. Se você enviar o arquivo da logo, eu troco sem custo extra.
- Nenhuma alteração de banco, edge function ou área administrativa.

## Pontos que preciso confirmar
1. Manter os valores de certificação por competência atuais da Multplick (1 a 4 cursos, de R$ 1.499,90 a R$ 4.599,90) ou remover essa tabela? O site do parceiro não publica preço de competência.
2. A paleta laranja atual das páginas continua, certo?
