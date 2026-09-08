CREATE OR REPLACE FUNCTION private.order_belongs_to_active_company(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.companies c ON c.id = o.company_id
    WHERE o.id = _order_id AND c.is_active
  )
$$;

REVOKE ALL ON FUNCTION private.order_belongs_to_active_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.order_belongs_to_active_company(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "anyone can add order items" ON public.order_items;
CREATE POLICY "anyone can add order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (private.order_belongs_to_active_company(order_id));