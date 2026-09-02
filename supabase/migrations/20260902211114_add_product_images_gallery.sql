-- Suporte a múltiplas fotos por produto.
-- products.image_url continua existindo e passa a representar a "foto de capa"
-- (a primeira da lista) — usada nas miniaturas/cards, sem precisar alterar
-- os lugares que já exibem só uma imagem. A galeria completa fica em
-- product_images, usada no catálogo público para o cliente ver todas as fotos.

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_idx ON public.product_images (product_id, sort_order);
CREATE INDEX product_images_company_idx ON public.product_images (company_id);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Catálogo público: qualquer pessoa vê as fotos de produtos ativos de empresas ativas.
CREATE POLICY "public reads images of active products" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (
    private.company_is_active(company_id)
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND p.is_active
    )
  );

-- Admin: cada empresa só enxerga/gerencia as fotos dos seus próprios produtos (master vê tudo).
CREATE POLICY "company admins read own images" ON public.product_images
  FOR SELECT TO authenticated
  USING ((company_id = private.company_of(auth.uid())) OR private.is_master(auth.uid()));

CREATE POLICY "company admins insert images" ON public.product_images
  FOR INSERT TO authenticated
  WITH CHECK ((company_id = private.company_of(auth.uid())) AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "company admins update images" ON public.product_images
  FOR UPDATE TO authenticated
  USING ((company_id = private.company_of(auth.uid())) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (company_id = private.company_of(auth.uid()));

CREATE POLICY "company admins delete images" ON public.product_images
  FOR DELETE TO authenticated
  USING ((company_id = private.company_of(auth.uid())) AND public.has_role(auth.uid(), 'admin'::app_role));

-- Migra as fotos já cadastradas (uma por produto) para a nova galeria, como primeira foto.
INSERT INTO public.product_images (product_id, company_id, image_url, sort_order)
SELECT id, company_id, image_url, 0
FROM public.products
WHERE image_url IS NOT NULL;
