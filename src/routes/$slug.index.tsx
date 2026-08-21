import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { CartBar } from "@/components/catalog/CartBar";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductDetailModal } from "@/components/catalog/ProductDetailModal";
import { Button } from "@/components/ui/button";
import { brandingStyle } from "@/lib/branding";
import { addToCart, setQuantity, totalItems, useCart } from "@/lib/cart";
import { catalogQueryOptions } from "@/lib/catalog-queries";
import type { CatalogProduct } from "@/lib/catalog.functions";

export const Route = createFileRoute("/$slug/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(catalogQueryOptions(params.slug)),
  head: ({ loaderData }) => {
    const name = loaderData?.settings.storeName ?? "Catálogo";
    const tagline =
      loaderData?.settings.storeTagline ??
      "Escolha os produtos e finalize o pedido pelo WhatsApp.";
    const title = `${name} — pedido rápido pelo WhatsApp`;
    return {
      meta: [
        { title },
        { name: "description", content: tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: tagline },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: tagline },
      ],
    };
  },
  errorComponent: CatalogError,
  notFoundComponent: CatalogNotFound,
  component: CatalogPage,
});

function CatalogError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-bold">Não conseguimos carregar o catálogo</h1>
      <p className="text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente em alguns segundos.
      </p>
      <Button className="h-12 rounded-full px-6" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </main>
  );
}

function CatalogNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-bold">Catálogo não encontrado</h1>
      <p className="text-sm text-muted-foreground">
        Este endereço não existe ou o catálogo está indisponível no momento.
      </p>
    </main>
  );
}

function CatalogPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(catalogQueryOptions(slug));
  const cart = useCart(slug);
  const count = totalItems(cart);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const categories = data.categories ?? [];
  const visibleProducts = useMemo(
    () =>
      categoryId === "all"
        ? data.products
        : data.products.filter((product) => product.category_id === categoryId),
    [data.products, categoryId],
  );

  const quantityOf = (id: string) => cart.find((item) => item.id === id)?.quantity ?? 0;

  const cartActions = (product: CatalogProduct) => ({
    onAdd: () => {
      addToCart({
        id: product.id,
        title: product.title,
        imageUrl: product.image_url,
      });
      toast.success("Adicionado ao carrinho");
    },
    onIncrement: () => setQuantity(product.id, quantityOf(product.id) + 1),
    onDecrement: () => {
      const next = quantityOf(product.id) - 1;
      setQuantity(product.id, next);
      if (next <= 0) toast("Produto removido do carrinho");
    },
  });

  return (
    <div className="min-h-screen bg-background pb-28" style={brandingStyle(data.company)}>
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {data.company.logoUrl ? (
              <img
                src={data.company.logoUrl}
                alt={`Logo ${data.company.name}`}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">
                {data.settings.storeName}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {data.settings.storeTagline}
              </p>
            </div>
          </div>
          <Link
            to="/$slug/carrinho"
            params={{ slug }}
            aria-label={`Abrir carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
            className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {categories.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categoria
            </p>
            <div
              role="group"
              aria-label="Filtrar por categoria"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {[{ id: "all", name: "Todas" }, ...categories].map((category) => {
                const active = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategoryId(category.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <h2 className="text-lg font-semibold">Nenhum produto disponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {categoryId === "all"
                ? "Volte em breve: o catálogo está sendo atualizado."
                : "Nenhum produto nesta categoria. Escolha \u201cTodas\u201d para ver tudo."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantityOf(product.id)}
                onAdd={() => {
                  addToCart({
                    id: product.id,
                    title: product.title,
                    imageUrl: product.image_url,
                  });
                  toast.success("Adicionado ao carrinho");
                }}
                onIncrement={() => setQuantity(product.id, quantityOf(product.id) + 1)}
                onDecrement={() => {
                  const next = quantityOf(product.id) - 1;
                  setQuantity(product.id, next);
                  if (next <= 0) toast("Produto removido do carrinho");
                }}
              />
            ))}
          </div>
        )}
      </main>

      <CartBar slug={slug} count={count} />
    </div>
  );
}
