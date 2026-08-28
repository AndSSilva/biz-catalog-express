-- Novos campos de produto: valor, "em promoção" e disponibilidade.
-- Não implementa cobrança (o valor é só exibido) nem estoque numérico
-- (disponibilidade é um status, não uma contagem).

CREATE TYPE public.product_availability AS ENUM ('pronta_entrega', 'sob_encomenda');

ALTER TABLE public.products
  ADD COLUMN price numeric(10, 2),
  ADD COLUMN on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN availability public.product_availability NOT NULL DEFAULT 'pronta_entrega';

-- Índice para o filtro combinável de disponibilidade + promoção no catálogo público.
CREATE INDEX products_company_availability_idx ON public.products (company_id, availability);
CREATE INDEX products_company_on_sale_idx ON public.products (company_id, on_sale) WHERE on_sale;
