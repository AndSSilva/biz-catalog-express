-- Cadastro de medidas e tamanhos: habilitável pelo admin master, por empresa.
-- Os processos de cadastro e uso das medidas serão implementados em etapas posteriores.

ALTER TABLE public.companies
  ADD COLUMN size_measurement_enabled boolean NOT NULL DEFAULT false;
