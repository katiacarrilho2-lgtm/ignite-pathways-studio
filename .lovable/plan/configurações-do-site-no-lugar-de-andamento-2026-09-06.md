# Configurações do Site (no lugar de "Andamento")

Uma única área no painel da sede para editar o site público — identidade visual, página inicial, textos das páginas, menu, rodapé, contato e imagens — com rascunho e publicação.

## O que muda para você

Hoje o item "Andamento" do menu só mostra um aviso de manutenção. Ele passa a ser **Configurações do site**, com abas:

- **Identidade** — logo, cores principais e fontes.
- **Página inicial** — imagem e texto da capa, os 4 números, os 4 diferenciais, ordem das seções.
- **Páginas** — textos de Sobre, Empresas, In Company, Seja Licenciado e Contato.
- **Menu e rodapé** — itens do topo, colunas e links do rodapé.
- **Contato e redes** — telefone, WhatsApp, e-mail, endereço, CNPJ e links das redes sociais (puxando o que já está cadastrado nos dados da empresa).
- **Mídia** — escolher imagens da biblioteca já existente do Marketing ou enviar novas.
- **Publicação** — pré-visualizar como rascunho e publicar quando estiver aprovado.

Enquanto nada for publicado, o site continua exatamente como está hoje: o conteúdo atual entra como valor padrão.

## Entrega em 4 blocos

**Bloco 1 — Base e Identidade (3–4 créditos)**
Guardar as configurações no banco, criar a tela com abas no lugar de "Andamento" (acesso só para a sede), fazer o site ler logo, cores e fontes, com rascunho/publicado desde o início.

**Bloco 2 — Página inicial (4–5 créditos)**
Capa (imagem, título, frase, botões), números, diferenciais e ordem das seções editáveis, com pré-visualização.

**Bloco 3 — Textos, menu e rodapé (4–5 créditos)**
Textos das páginas institucionais, itens do menu, rodapé, contato e redes sociais alimentados pelos dados da empresa.

**Bloco 4 — Mídia e publicação (3–5 créditos)**
Seletor de imagens ligado à biblioteca do Marketing, upload direto, histórico simples de versões e botão de restaurar a última publicação.

Total estimado: 14 a 20 créditos. Paro e aviso ao atingir 20.

## Detalhes técnicos

- Nova tabela `site_settings` (chave/seção + JSON de rascunho + JSON publicado + autor/data), com RLS: leitura pública apenas do conteúdo publicado; escrita só para staff da Matriz (`is_matriz_staff`), nunca para contas de polo. GRANTs explícitos para `anon` (select) e `authenticated`/`service_role`.
- Nova tabela `site_media` opcional apenas se o seletor não puder reusar `mkt_assets`; a preferência é reaproveitar `mkt_assets` + bucket `marketing-files`.
- Hook `useSiteSettings` com cache, valores padrão iguais ao conteúdo atual (fallback), e modo `?preview=1` para ver o rascunho.
- Cores e fontes aplicadas via variáveis CSS em `index.css` sobrescritas em runtime — sem cor fixa em componentes.
- Páginas afetadas na leitura: `Index.tsx`, `Sobre`, `Empresas`, `InCompany`, `Licenciado`, `Contato`, `Navbar.tsx`, `Footer.tsx`.
- `AdminAndamento.tsx` é substituído por `AdminSiteConfig.tsx`; rota `/admin/andamento` passa a `/admin/site` (com redirecionamento), item do menu e permissão `mod_andamento` reaproveitados/renomeados.
- Sem qualquer alteração em financeiro, matrículas, repasses, InfinitePay ou portal do polo.
- Testes autenticados usarão o usuário administrativo **001** da sede; nenhum usuário de polo será utilizado.
