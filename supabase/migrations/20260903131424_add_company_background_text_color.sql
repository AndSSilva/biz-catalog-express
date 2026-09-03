-- Cor de fundo e cor de letra por empresa, editáveis pelo admin master.
-- Ficam em branco por padrão (string vazia) e, nesse caso, o catálogo/admin
-- usa as cores padrão do design system — mesmo comportamento de hoje para
-- empresas já cadastradas.

ALTER TABLE public.companies
  ADD COLUMN background_color text NOT NULL DEFAULT '',
  ADD COLUMN text_color text NOT NULL DEFAULT '';
