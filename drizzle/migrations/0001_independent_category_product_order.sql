ALTER TABLE public.products ADD COLUMN category_sort_order integer NOT NULL DEFAULT 1;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY company_id, category_id ORDER BY sort_order, created_at, id)::integer AS position
  FROM public.products
)
UPDATE public.products p SET category_sort_order = r.position FROM ranked r WHERE p.id = r.id;
ALTER TABLE public.products ADD CONSTRAINT products_category_position_positive CHECK (category_sort_order > 0);
ALTER TABLE public.products ADD CONSTRAINT products_category_position_unique UNIQUE (company_id, category_id, category_sort_order) DEFERRABLE INITIALLY DEFERRED;
COMMENT ON COLUMN public.products.category_sort_order IS 'Independent 1-based category position; general sort_order is never changed by category reordering.';
CREATE OR REPLACE FUNCTION public.assign_product_category_position()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_id = OLD.company_id AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text, 74321));
  IF NEW.category_id IS NULL THEN NEW.category_sort_order := 1;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = NEW.category_id AND company_id = NEW.company_id) THEN RAISE EXCEPTION 'invalid category'; END IF;
    SELECT coalesce(max(category_sort_order), 0) + 1 INTO NEW.category_sort_order FROM public.products WHERE company_id = NEW.company_id AND category_id = NEW.category_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_product_category_position() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER products_assign_category_position BEFORE INSERT OR UPDATE OF category_id, company_id ON public.products FOR EACH ROW EXECUTE FUNCTION public.assign_product_category_position();
CREATE OR REPLACE FUNCTION public.compact_product_category_positions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_id = OLD.company_id AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN RETURN NULL; END IF;
  IF OLD.category_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.company_id::text, 74321));
    WITH ranked AS (SELECT id, row_number() OVER (ORDER BY category_sort_order, sort_order, created_at, id)::integer AS position FROM public.products WHERE company_id = OLD.company_id AND category_id = OLD.category_id)
    UPDATE public.products p SET category_sort_order = r.position FROM ranked r WHERE p.id = r.id AND p.category_sort_order <> r.position;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.compact_product_category_positions() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER products_compact_category_positions AFTER DELETE OR UPDATE OF category_id, company_id ON public.products FOR EACH ROW EXECUTE FUNCTION public.compact_product_category_positions();
CREATE OR REPLACE FUNCTION public.reorder_category_products(_company_id uuid, _category_id uuid, _ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _total integer; _updated integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND company_id = _company_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_company_id::text, 74321));
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = _category_id AND company_id = _company_id) THEN RAISE EXCEPTION 'invalid category'; END IF;
  IF _ids IS NULL OR cardinality(_ids) = 0 THEN RAISE EXCEPTION 'empty sequence'; END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(_ids) x) <> cardinality(_ids) THEN RAISE EXCEPTION 'duplicate products in sequence'; END IF;
  SELECT count(*) INTO _total FROM public.products WHERE company_id = _company_id AND category_id = _category_id;
  IF _total <> cardinality(_ids) THEN RAISE EXCEPTION 'stale_sequence'; END IF;
  UPDATE public.products p SET category_sort_order = s.ord FROM unnest(_ids) WITH ORDINALITY AS s(id, ord) WHERE p.id = s.id AND p.company_id = _company_id AND p.category_id = _category_id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated <> _total THEN RAISE EXCEPTION 'stale_sequence'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.reorder_category_products(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_category_products(uuid, uuid, uuid[]) TO authenticated;