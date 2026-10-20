CREATE OR REPLACE FUNCTION public.reorder_products(_company_id uuid, _ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _total integer;
  _updated integer;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'empty sequence';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(_ids) x) <> array_length(_ids, 1) THEN
    RAISE EXCEPTION 'duplicate products in sequence';
  END IF;
  SELECT count(*) INTO _total FROM public.products WHERE company_id = _company_id;
  IF _total <> array_length(_ids, 1) THEN
    RAISE EXCEPTION 'stale_sequence' USING ERRCODE = 'P0001', HINT = 'products changed';
  END IF;
  UPDATE public.products p
     SET sort_order = s.ord
    FROM unnest(_ids) WITH ORDINALITY AS s(id, ord)
   WHERE p.id = s.id AND p.company_id = _company_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated <> _total THEN
    RAISE EXCEPTION 'stale_sequence' USING ERRCODE = 'P0001', HINT = 'products changed';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.reorder_products(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_products(uuid, uuid[]) TO authenticated;