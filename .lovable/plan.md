# MVP: Catálogo com pedido via WhatsApp

## Stack
TanStack Start (React 19 + SSR, já configurado) + Tailwind v4 + Lovable Cloud (banco, login do admin, storage de imagens) + Lovable AI para gerar título/descrição. Motivo: SSR dá boa prévia de link no WhatsApp e SEO, o backend integrado cobre auth/upload/dados sem serviço externo, e o bundle fica leve para 4G.

## Telas
- `/` — Catálogo público: grade de cards (1 coluna no mobile, 2–4 no desktop), foto, nome, descrição curta, botão adicionar / controle de quantidade quando já no carrinho. Barra fixa inferior "🛒 Carrinho — N itens".
- `/carrinho` — Itens, ajuste de quantidade, remover, limpar carrinho (com confirmação se houver mais de 1 item), total de itens, voltar ao catálogo, botão grande "Finalizar pedido no WhatsApp".
- `/admin/login` — Login do dono (e-mail + senha).
- `/admin` — Dashboard: pedidos iniciados, itens selecionados, produto mais selecionado, produtos ativos, tabela de mais selecionados, últimos pedidos.
- `/admin/produtos` — Lista com reordenação (setas ↑/↓ no MVP), ativar/desativar, editar, excluir.
- `/admin/produtos/novo` e `/admin/produtos/$id` — Formulário: foto, título, descrição, ativo, ordem + botão "Gerar com IA".
- `/admin/config` — Número de WhatsApp e mensagem de saudação.

## Dados
- `products`: id, title, description, image_url, is_active, sort_order, timestamps.
- `settings`: chave única (whatsapp_number, greeting) — leitura pública apenas do número.
- `orders`: id, total_items, created_at.
- `order_items`: order_id, product_id, product_title (snapshot), quantity.

Leitura pública: só produtos ativos e o número de WhatsApp. Escrita: apenas admin autenticado, validada no servidor (RLS + funções de servidor), nunca só escondendo botões. Papel de admin em tabela separada `user_roles` com função `has_role`.

## Fluxo do pedido
Carrinho em `localStorage` (sem conta, sem login). Ao finalizar: grava a conversão no servidor (1 pedido + quantidade por produto), monta a mensagem, abre `https://wa.me/<numero>?text=<encodeURIComponent(...)>` em nova aba e limpa o carrinho imediatamente. Se o registro falhar, o WhatsApp ainda abre — o pedido nunca é bloqueado por analytics.

Mensagem: saudação + linhas "Produto — N unidade(s)" + "Total de itens: N" + fechamento, com acentos e quebras de linha codificados corretamente.

## IA
Server function isolada (`generateProductCopy`) que recebe a descrição livre do admin e devolve título, descrição curta e descrição comercial. Chave da IA só no servidor. Nada é publicado automaticamente: o admin edita e salva.

## Design / UX
Layout mobile-first testado de 360px a 430px e em 1280/1440/1920px. Botões com alvo de toque confortável, tipografia legível, fotos em proporção fixa com `loading="lazy"`, sem animações pesadas. Estados cobertos: carregando, adicionando, já no carrinho, carrinho vazio, item removido, carrinho limpo, erro ao carregar catálogo, erro ao salvar produto, erro de upload, erro de IA, catálogo vazio, pedido finalizado — com feedback via toast.

Direção visual: catálogo comercial moderno e elegante (não painel administrativo), tokens semânticos no design system, tipografia com personalidade, paleta neutra quente com uma cor de destaque.

## SEO / compartilhamento
Título, meta description, Open Graph e Twitter card por rota, favicon e URLs amigáveis, para que o link compartilhado no WhatsApp tenha prévia profissional.

## Fora do escopo
Pagamento, checkout, contas de cliente, estoque, cupons, frete, avaliações, preços (estrutura preparada para adicionar depois).
