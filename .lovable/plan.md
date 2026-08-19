# Multi-empresa (multi-tenant) + Admin Master

## Como o sistema identifica a empresa

Uma URL por empresa, por caminho: `/loja-da-maria` (catálogo) e `/loja-da-maria/carrinho`.
Motivo: funciona no domínio atual sem DNS/wildcard, é compartilhável no WhatsApp com SSR e
prévia de link, e o slug já dá o `company_id` no servidor. Subdomínio ficaria mais bonito,
mas exige domínio próprio e certificado curinga — pode vir depois sem quebrar nada.

Rotas fixas (`/admin`, `/master`, `/carrinho` legado) têm prioridade sobre o slug, então não
há conflito. A raiz `/` passa a ser uma página neutra da plataforma (ou redireciona para a
primeira empresa ativa, se preferir).

## Três níveis de acesso

1. **Cliente final** — sem login. Lê apenas produtos ativos da empresa do slug (política
   pública restrita a empresas ativas). Carrinho no `localStorage`, separado por empresa.
2. **Admin de empresa** — login em `/admin/login`, vinculado a exatamente uma empresa.
   Toda leitura/escrita filtra pelo vínculo dele no banco; manipular URL ou requisição não
   dá acesso a outra empresa.
3. **Admin Master** — login em `/master/login`, papel `master`. Só quem já tem o papel no
   banco entra; não há autocadastro, não há link em nenhuma tela de empresa ou do cliente.
   Conhecer a URL não basta — a checagem é no backend, por papel.

O papel `master` é concedido no banco (primeiro acesso feito por nós); o cadastro aberto
que hoje transforma o primeiro usuário em admin será removido.

## O que o Admin Master faz

- Cadastrar empresa: nome, slug, logo (upload), cor primária e secundária, WhatsApp e
  saudação iniciais.
- Criar admins da empresa: nome, e-mail, senha (cadastro direto, sem convite por e-mail).
- Listar todas as empresas, com contagem de produtos e pedidos.
- Editar empresa e ativar/desativar. Desativar apenas esconde o catálogo público e bloqueia
  o admin daquela empresa — nenhum dado é excluído.

## Branding dinâmico

Logo e paleta vêm da empresa e são aplicadas como variáveis do design system no catálogo
público e no admin daquela empresa — sem cores fixas no código.

## O que muda no que já existe

- `products`, `categories`, `settings`, `orders` passam a ter empresa; `settings` deixa de
  ser global (chave passa a ser empresa + chave).
- Catálogo, carrinho e admin de produtos/categorias/config/dashboard passam a operar sempre
  dentro da empresa atual.
- O fluxo catálogo → carrinho → WhatsApp continua igual para o cliente, só respeitando
  produtos e branding da empresa certa.
- Os dados de hoje serão migrados para uma primeira empresa (nome e slug definidos por
  você) — nada é perdido.

## Detalhes técnicos

- Tabelas novas: `companies` (nome, slug único, logo_url, primary_color, secondary_color,
  is_active) e `company_members` (user_id, company_id). Papel `master` adicionado ao enum
  `app_role`; `user_roles` continua sendo a única fonte de papéis.
- `company_id NOT NULL` em `products`, `categories`, `orders`; `settings` com chave composta
  (company_id, key). `order_items` herda o isolamento via `orders`.
- Funções SECURITY DEFINER: `is_master(uid)` e `company_of(uid)`. RLS reescrita: anon lê só
  produtos ativos de empresas ativas; admin de empresa lê/escreve só onde
  `company_id = company_of(auth.uid())`; master enxerga tudo. GRANTs junto de cada tabela.
- Criação de admin de empresa via server function protegida (`.middleware([requireSupabaseAuth])`),
  que confirma `is_master` antes de usar o cliente admin para criar o usuário, e então grava
  papel + vínculo.
- Logos em bucket próprio (`company-logos`); imagens de produto continuam em `product-images`
  com caminho por empresa.
- Rotas: `src/routes/$slug/index.tsx`, `src/routes/$slug/carrinho.tsx`,
  `src/routes/master/login.tsx` e `src/routes/_master/*` (gate por papel `master`).
  Server functions públicas recebem o slug e resolvem o `company_id` no servidor.
- `head()` por rota com título/descrição/OG por empresa.

## Fora desta etapa

Cobrança/planos, convite por e-mail, subdomínios, domínio próprio por empresa.
