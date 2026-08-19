-- 1. Empresas
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#b8451f',
  secondary_color text NOT NULL DEFAULT '#1f6f5c',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Vínculo admin -> empresa
CREATE TABLE public.company_members (
  user_id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- 3. Funções de identidade
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'master')
$$;

CREATE OR REPLACE FUNCTION public.company_of(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_members WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.company_is_active(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE id = _company_id AND is_active)
$$;

-- 4. Políticas de companies / company_members
CREATE POLICY "public reads active companies" ON public.companies FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_master(auth.uid()) OR id = public.company_of(auth.uid()));
CREATE POLICY "master inserts companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "master updates companies" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "members read own link" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

-- 5. Empresa inicial com os dados atuais
INSERT INTO public.companies (name, slug, primary_color, secondary_color)
VALUES (
  COALESCE((SELECT value FROM public.settings WHERE key = 'store_name' AND value <> ''), 'Catálogo'),
  'catalogo', '#b8451f', '#1f6f5c'
);

-- 6. company_id nas tabelas existentes
ALTER TABLE public.products ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;
ALTER TABLE public.categories ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;
ALTER TABLE public.orders ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;
ALTER TABLE public.settings ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;

UPDATE public.products SET company_id = (SELECT id FROM public.companies WHERE slug = 'catalogo');
UPDATE public.categories SET company_id = (SELECT id FROM public.companies WHERE slug = 'catalogo');
UPDATE public.orders SET company_id = (SELECT id FROM public.companies WHERE slug = 'catalogo');
UPDATE public.settings SET company_id = (SELECT id FROM public.companies WHERE slug = 'catalogo');

ALTER TABLE public.products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN company_id SET NOT NULL;

-- settings passa a ser por empresa
ALTER TABLE public.settings DROP CONSTRAINT settings_pkey;
ALTER TABLE public.settings ADD PRIMARY KEY (company_id, key);
ALTER TABLE public.categories ADD CONSTRAINT categories_company_slug_key UNIQUE (company_id, slug);
CREATE INDEX products_company_idx ON public.products (company_id, sort_order);
CREATE INDEX orders_company_idx ON public.orders (company_id, created_at DESC);

-- 7. Vincular o admin atual à empresa inicial e torná-lo master da plataforma
INSERT INTO public.company_members (user_id, company_id, full_name)
SELECT ur.user_id, (SELECT id FROM public.companies WHERE slug = 'catalogo'), ''
FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'master' FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Reescrever RLS por empresa
DROP POLICY "anyone can read active products" ON public.products;
DROP POLICY "admins read all products" ON public.products;
DROP POLICY "admins insert products" ON public.products;
DROP POLICY "admins update products" ON public.products;
DROP POLICY "admins delete products" ON public.products;
CREATE POLICY "public reads active products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_active AND public.company_is_active(company_id));
CREATE POLICY "company admins read products" ON public.products FOR SELECT TO authenticated
  USING (company_id = public.company_of(auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "company admins insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "company admins update products" ON public.products FOR UPDATE TO authenticated
  USING (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.company_of(auth.uid()));
CREATE POLICY "company admins delete products" ON public.products FOR DELETE TO authenticated
  USING (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY "anyone can read categories" ON public.categories;
DROP POLICY "admins insert categories" ON public.categories;
DROP POLICY "admins update categories" ON public.categories;
DROP POLICY "admins delete categories" ON public.categories;
CREATE POLICY "public reads categories" ON public.categories FOR SELECT TO anon, authenticated
  USING (public.company_is_active(company_id) OR company_id = public.company_of(auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "company admins insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "company admins update categories" ON public.categories FOR UPDATE TO authenticated
  USING (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.company_of(auth.uid()));
CREATE POLICY "company admins delete categories" ON public.categories FOR DELETE TO authenticated
  USING (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY "anyone can read settings" ON public.settings;
DROP POLICY "admins insert settings" ON public.settings;
DROP POLICY "admins update settings" ON public.settings;
CREATE POLICY "public reads settings" ON public.settings FOR SELECT TO anon, authenticated
  USING (public.company_is_active(company_id) OR company_id = public.company_of(auth.uid()) OR public.is_master(auth.uid()));
CREATE POLICY "company admins insert settings" ON public.settings FOR INSERT TO authenticated
  WITH CHECK (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "company admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (company_id = public.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.company_of(auth.uid()));

DROP POLICY "anyone can start an order" ON public.orders;
DROP POLICY "admins read orders" ON public.orders;
CREATE POLICY "anyone can start an order" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (public.company_is_active(company_id));
CREATE POLICY "company admins read orders" ON public.orders FOR SELECT TO authenticated
  USING (company_id = public.company_of(auth.uid()) OR public.is_master(auth.uid()));

DROP POLICY "anyone can add order items" ON public.order_items;
DROP POLICY "admins read order items" ON public.order_items;
CREATE POLICY "anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.company_is_active(o.company_id)));
CREATE POLICY "company admins read order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.company_id = public.company_of(auth.uid()) OR public.is_master(auth.uid()))));

-- 9. Fim do autocadastro de admin
DROP FUNCTION IF EXISTS public.claim_admin();

-- 10. Imagens de produto isoladas por pasta da empresa
DROP POLICY IF EXISTS "admins manage product images" ON storage.objects;
CREATE POLICY "company admins manage product images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND (public.is_master(auth.uid()) OR (storage.foldername(name))[1] = public.company_of(auth.uid())::text))
  WITH CHECK (bucket_id = 'product-images' AND (public.is_master(auth.uid()) OR (storage.foldername(name))[1] = public.company_of(auth.uid())::text));