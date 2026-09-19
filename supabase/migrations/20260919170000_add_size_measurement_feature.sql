-- Enable the measurements control per company.
-- Measurement registration and usage will be implemented in later steps.

ALTER TABLE public.companies
  ADD COLUMN size_measurement_enabled boolean NOT NULL DEFAULT false;
