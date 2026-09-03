-- Quantidade em estoque (1 a 999) e controle de exibição no catálogo público.
-- Regra de negócio (aplicada no app, não no banco): pronta entrega começa em 1,
-- sob encomenda começa e fica travado em 0 — o banco só garante a faixa válida.

ALTER TABLE public.products
  ADD COLUMN stock_quantity integer NOT NULL DEFAULT 0
    CHECK (stock_quantity >= 0 AND stock_quantity <= 999),
  ADD COLUMN show_stock_in_catalog boolean NOT NULL DEFAULT false;

-- Produtos já cadastrados como "pronta entrega" recebem 1 em estoque por padrão,
-- para não ficarem com 0 (que passaria a impressão de "esgotado") sem essa
-- informação ter sido definida antes de o campo existir.
UPDATE public.products
SET stock_quantity = 1
WHERE availability = 'pronta_entrega' AND stock_quantity = 0;
