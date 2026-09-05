-- Controle de estoque: habilitável pelo admin master, por empresa.
-- Quando habilitado, a empresa ganha a aba "Estoque" no admin, com:
--   1) Inventário — contagem manual que sobrescreve o estoque ao finalizar
--   2) Operação de estoque — baixas pendentes geradas pelo checkout, que o
--      admin aprova (baixa o estoque) ou cancela (não altera nada)
--   3) Logs — todo evento das duas operações acima

ALTER TABLE public.companies
  ADD COLUMN stock_control_enabled boolean NOT NULL DEFAULT false;

-- Helper para a policy de INSERT público (checkout) só valer quando a
-- empresa realmente tem controle de estoque ligado.
CREATE OR REPLACE FUNCTION private.company_stock_control_enabled(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id AND is_active AND stock_control_enabled
  )
$$;
GRANT EXECUTE ON FUNCTION private.company_stock_control_enabled(uuid) TO anon, authenticated, service_role;

-- 1. Operações de estoque pendentes (uma por item vendido no catálogo)
CREATE TABLE public.stock_pending_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);
CREATE INDEX stock_pending_operations_company_status_idx
  ON public.stock_pending_operations (company_id, status, created_at DESC);

ALTER TABLE public.stock_pending_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkout creates pending stock operations" ON public.stock_pending_operations
  FOR INSERT TO anon, authenticated
  WITH CHECK (private.company_stock_control_enabled(company_id));

CREATE POLICY "company admins read stock operations" ON public.stock_pending_operations
  FOR SELECT TO authenticated
  USING ((company_id = private.company_of(auth.uid())) OR private.is_master(auth.uid()));

CREATE POLICY "company admins resolve stock operations" ON public.stock_pending_operations
  FOR UPDATE TO authenticated
  USING ((company_id = private.company_of(auth.uid())) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (company_id = private.company_of(auth.uid()));

-- 2. Contagens de inventário (uma "sessão" de contagem por vez)
CREATE TABLE public.stock_inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  started_by uuid REFERENCES auth.users(id),
  finished_by uuid REFERENCES auth.users(id)
);
CREATE INDEX stock_inventory_counts_company_idx
  ON public.stock_inventory_counts (company_id, status, started_at DESC);

ALTER TABLE public.stock_inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company admins manage inventory counts" ON public.stock_inventory_counts
  FOR ALL TO authenticated
  USING (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  )
  WITH CHECK (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  );

-- 3. Itens de cada contagem (snapshot do estoque no início + valor contado)
CREATE TABLE public.stock_inventory_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_count_id uuid NOT NULL REFERENCES public.stock_inventory_counts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  previous_quantity integer NOT NULL,
  counted_quantity integer,
  counted_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX stock_inventory_count_items_count_idx
  ON public.stock_inventory_count_items (inventory_count_id, sort_order);

ALTER TABLE public.stock_inventory_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company admins manage inventory count items" ON public.stock_inventory_count_items
  FOR ALL TO authenticated
  USING (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  )
  WITH CHECK (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  );

-- 4. Logs — todo evento das duas operações acima
CREATE TABLE public.stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_logs_company_idx ON public.stock_logs (company_id, created_at DESC);

ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company admins manage stock logs" ON public.stock_logs
  FOR ALL TO authenticated
  USING (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  )
  WITH CHECK (
    (company_id = private.company_of(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
    OR private.is_master(auth.uid())
  );
