# Loja Online Multplick — estimativa e plano (execução única)

## Estimativa de créditos
**Total estimado: 18 a 24 créditos**, executado em um único bloco depois do seu "ok".

| Bloco | Créditos |
|---|---|
| Banco de dados (categorias, produtos/campos na tabela de cursos, combos, pedidos, pagamentos, cupons, promoções, banners, configurações) + regras de acesso por conta | 3–4 |
| Loja pública: /loja, banners em carrossel, busca, categorias, destaques, ofertas, "por objetivo", área Corporativa | 3–4 |
| Página do produto /curso/[slug] com abas, selos regulatórios opcionais, WhatsApp, SEO | 2–3 |
| Tipos de venda: compra direta, consulta antes da compra (formulário → CRM), solicitar proposta (Lead Corporativo) | 1–2 |
| Carrinho + checkout em 4 passos (carrinho, identificação, pagamento, confirmação), cupom validado no servidor | 2–3 |
| InfinitePay: geração do checkout, webhook validado, logs, anti-duplicação, pós-pagamento (aluno, pré-matrícula, financeiro, alerta, CRM "Venda realizada", origem/polo/consultor) | 3–4 |
| Admin dentro de "Configurações": Loja, Produtos, Categorias, Combos, Banners, Promoções, Cupons, Pagamentos, Pedidos (filtros + CSV), Aparência, Integrações, Dashboard | 3–4 |
| Consulta segura para a Rebecca, testes no celular/desktop, verificação de segurança, relatório | 1 |

## O que será reaproveitado (sem duplicar)
- Tabela de cursos atual como base dos produtos (novo campo "Disponível na loja", padrão NÃO — nenhum curso aparece sozinho).
- Categorias de cursos existentes, CRM/leads, pré-matrículas, financeiro, afiliados/polos (`?ref` e conta), cupons (a tela atual em manutenção vira o módulo de Promoções e Cupons), auditoria, login de alunos, botão oficial de WhatsApp, logo e cores atuais.
- Regra de repasse aos polos não é alterada; apenas a origem da venda é enviada ao financeiro.
- Cursos livres/certificação (Etapas 1–7) e as funções de pagamento atuais do Mercado Pago continuam intactos.

## Regras que serão respeitadas
- Nenhum preço, duração, carga horária, desconto, parcelamento, MEC, SISTEC ou conselho inventado: campos ficam vazios para você preencher; selos só aparecem quando ativados por curso.
- Valor sempre calculado no servidor; pagamento só vale após confirmação da InfinitePay (não pelo retorno do navegador).
- Polo/licenciado só vê os próprios pedidos; sede vê o consolidado.
- Nada apagado; mudanças apenas aditivas.
- Categorias iniciais da loja e do corporativo criadas vazias e editáveis.

## Dependências suas
- Credenciais da InfinitePay (identificador/handle da conta e chave, se exigida pela API vigente) — guardadas em cofre seguro. Sem elas, tudo fica pronto, mas o botão de pagar mostra "pagamento ainda não configurado" e o teste real de pagamento fica pendente.
- Número de WhatsApp da loja (se diferente do atual).
- Preços, imagens e textos dos produtos que você quiser publicar.

## Observações técnicas
- A API da InfinitePay será conferida na documentação oficial no início da execução; se o modo sandbox não existir, o teste será feito com valor mínimo real ou simulação do webhook no servidor.
- Pedidos da loja em tabelas próprias (`store_*`), separadas dos pedidos de cursos livres, com `account_id` e RLS no mesmo padrão já usado.
- Consulta da Rebecca: função de leitura que devolve apenas produtos ativos, com preço vigente vindo do cadastro.

Ao aprovar, executo tudo de uma vez e entrego o relatório de 10 itens solicitado.
