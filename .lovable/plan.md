# Etapa 3 — Vitrine pública, cadastro do aluno e pedido pendente

Somente a Etapa 3. Nada de cobrança real; `create-payment` e `mp-webhook` não serão tocados.

## O que o usuário verá

1. Nova página **/certifique-sua-experiencia** (fora do menu do site, não divulgada): hero "TEM EXPERIÊNCIA? VALORIZE O QUE VOCÊ JÁ SABE FAZER!", destaque "CURSOS A PARTIR DE R$ 59,90*" com a observação em rodapé, barra de busca grande, filtros por categoria (usando as categorias já cadastradas) e cards com imagem, nome, categoria, descrição curta, preço vigente (preço normal riscado quando houver promoção válida) e botão VER CURSO.
2. Página de detalhes por endereço próprio (ex.: `/certifique-sua-experiencia/excel-basico-e-avancado`): imagem, descrição, tipo da formação, valor, informações da avaliação quando configuradas e botão QUERO COMEÇAR. Nada sobre certificado enquanto a certificação automática estiver desligada.
3. Ao clicar em QUERO COMEÇAR: entrar com a conta existente ou criar conta. Quem já está logado só completa o que faltar (CPF, nascimento, WhatsApp, cidade, estado). CPF com máscara e validação; CPF já usado por outra pessoa orienta a entrar na conta existente, sem criar duplicado.
4. Checkout (reaproveitando a página que hoje está "em manutenção", sem afetar outros fluxos): resumo com curso, valor, nome, CPF mascarado e e-mail, e botão CONTINUAR PARA PAGAMENTO. Nesta etapa ele apenas registra um pedido pendente e mostra o aviso "Pagamento será habilitado na próxima etapa".
5. Em **/aluno**, nova seção **Minhas compras**: curso, número do pedido, valor e status "Aguardando pagamento". Sem liberar prova nem certificado.
6. No painel da sede, botão **Pré-visualizar** nos cursos livres, que abre a vitrine em modo administrativo mostrando também os cursos ainda desativados. Visitante comum nunca vê curso desativado.

## Cursos piloto

Três registros novos e independentes (nenhum curso técnico existente é alterado ou reaproveitado): Excel Básico e Avançado, Administração – Mercado de Trabalho, Cuidador de Idosos. Cada um: tipo curso livre, exige avaliação SIM, venda automática DESATIVADA, certificação automática DESATIVADA, preço inicial R$ 59,90 (editável no painel). Sem inventar carga horária, ementa ou reconhecimento — campos ficam pendentes.

## Detalhes técnicos

- **Migração aditiva** (`0015_livre_pedidos_numero_e_rpc`):
  - `livre_orders`: coluna `numero_pedido text` única + sequência anual, preenchida por trigger no padrão `MPL-2026-000001` (identificador do pedido, distinto do futuro código do certificado).
  - Função `SECURITY DEFINER` `livre_criar_pedido(_course_id uuid)`: valida usuário autenticado, carrega o curso, recusa curso inativo ou sem preço, calcula o preço vigente no servidor (promoção com datas válidas, senão preço normal), resolve o `account_id` pelo perfil do aluno e grava o pedido com status `aguardando` e valor congelado. O navegador só informa o curso — nunca o valor.
  - Idempotência: se já existir pedido `aguardando` do mesmo aluno para o mesmo curso criado há pouco, a função devolve esse pedido em vez de criar outro (protege contra cliques repetidos e permite retomar).
  - Sem alteração em matrículas: nenhuma `enrollment` é criada nesta etapa.
- **Leitura pública**: consulta de vitrine filtra `active`, tipo curso livre, venda livre habilitada e preço válido. O modo de pré-visualização é restrito a quem tem permissão de cursos (verificação no servidor via RLS/permissão, não só no frontend).
- **Preço no frontend**: apenas exibição, usando `precoVigenteCents` já criado na Etapa 2; o valor válido é sempre o do servidor.
- **Arquivos**: novas páginas `src/pages/CertifiqueSuaExperiencia.tsx` e `src/pages/CertifiqueCurso.tsx`, reescrita de `src/pages/Checkout.tsx` para o fluxo de curso livre, nova aba/seção de compras em `src/pages/aluno/Financeiro.tsx`, rotas em `App.tsx`, botão de pré-visualização em `src/pages/admin/AdminCursos.tsx`. Autenticação e perfis reaproveitados (`useAuth`, `profiles`, `student_profiles`) — nenhum sistema paralelo.
- **SEO**: título e descrição próprios da página com Open Graph; sem publicar campanhas.
- **Cupons**: apenas espaço preparado na tela, sem integrar `AdminCupons` agora.
- **WhatsApp**: mantém o botão oficial existente.

## Testes

Playwright em desktop e celular: vitrine, busca, filtro, detalhes, login, cadastro, CPF duplicado, usuário já logado, checkout, preço normal, preço promocional válido, promoção expirada, criação do pedido, clique duplicado e tentativa de abrir pedido de outro aluno. Ao final, nova verificação de segurança comparada com a anterior.

## Ao final

Relatório com os 18 itens pedidos e parada — sem iniciar a Etapa 4.

Custo estimado: 4–5 créditos.
