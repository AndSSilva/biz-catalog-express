-- roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_sort_idx ON public.products (sort_order, created_at);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read active products" ON public.products
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins read all products" ON public.products
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- settings (single row keyed by key)
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read settings" ON public.settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert settings" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update settings" ON public.settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number', '5511999999999'),
  ('greeting', 'Olá! Gostaria de fazer um pedido:'),
  ('store_name', 'Catálogo'),
  ('store_tagline', 'Escolha os produtos e finalize pelo WhatsApp');

-- orders / conversions
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can start an order" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_product_idx ON public.order_items (product_id);
GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can add order items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- demo products
INSERT INTO public.products (title, description, image_url, is_active, sort_order) VALUES
  ('Camisa Básica Preta', 'Algodão premium, manga curta, caimento reto. Peça essencial para o dia a dia.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=70&auto=format&fit=crop', true, 1),
  ('Calça Jeans Reta', 'Jeans médio com lavagem clara, cintura média e acabamento reforçado.', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=70&auto=format&fit=crop', true, 2),
  ('Tênis Branco Minimalista', 'Couro sintético, solado emborrachado e design limpo para combinar com tudo.', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=70&auto=format&fit=crop', true, 3),
  ('Jaqueta Corta-Vento', 'Leve, resistente à água e com capuz embutido. Ideal para dias de vento.', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=70&auto=format&fit=crop', true, 4),
  ('Boné Aba Curva', 'Tecido estruturado, fechamento ajustável e bordado discreto na frente.', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=70&auto=format&fit=crop', true, 5),
  ('Mochila Urbana 20L', 'Compartimento para notebook, bolsos laterais e tecido impermeável.', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=70&auto=format&fit=crop', true, 6);