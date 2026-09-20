-- Medidas reutilizáveis por empresa e associáveis a produtos (uma medida pode
-- estar em vários produtos, e um produto pode ter mais de uma medida).
CREATE TABLE public.company_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) > 0 AND length(label) <= 40),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX company_measurements_label_ci_idx
  ON public.company_measurements (company_id, lower(trim(label)));
CREATE INDEX company_measurements_company_order_idx
  ON public.company_measurements (company_id, sort_order, created_at);

ALTER TABLE public.company_measurements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.company_measurements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_measurements TO authenticated;
GRANT ALL ON public.company_measurements TO service_role;

CREATE POLICY "public reads active company measurements"
  ON public.company_measurements FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = company_measurements.company_id
        AND companies.is_active
        AND companies.size_measurement_enabled
    )
  );

CREATE POLICY "company admins manage own measurements"
  ON public.company_measurements FOR ALL TO authenticated
  USING (
    company_id = private.company_of(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    company_id = private.company_of(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER company_measurements_updated_at
  BEFORE UPDATE ON public.company_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_measurements (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  measurement_id uuid NOT NULL REFERENCES public.company_measurements(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, measurement_id)
);

CREATE INDEX product_measurements_measurement_idx
  ON public.product_measurements (measurement_id, sort_order);

ALTER TABLE public.product_measurements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_measurements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_measurements TO authenticated;
GRANT ALL ON public.product_measurements TO service_role;

CREATE POLICY "public reads product measurements"
  ON public.product_measurements FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.companies ON companies.id = products.company_id
      JOIN public.company_measurements
        ON company_measurements.id = product_measurements.measurement_id
       AND company_measurements.company_id = products.company_id
      WHERE products.id = product_measurements.product_id
        AND products.is_active
        AND companies.is_active
        AND companies.size_measurement_enabled
        AND company_measurements.is_active
    )
  );

CREATE POLICY "company admins manage own product measurements"
  ON public.product_measurements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_measurements.product_id
        AND products.company_id = private.company_of(auth.uid())
    )
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.company_measurements
        ON company_measurements.id = product_measurements.measurement_id
       AND company_measurements.company_id = products.company_id
      WHERE products.id = product_measurements.product_id
        AND products.company_id = private.company_of(auth.uid())
    )
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
-- 
2.43.0
