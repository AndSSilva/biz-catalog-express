import { useMemo, useState, type ReactNode } from "react";
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
import type { CatalogProduct, ProductAvailability } from "@/lib/catalog.functions";
import { AVAILABILITY_LABEL } from "@/lib/price";

export const Route = createFileRoute("/$slug/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(catalogQueryOptions(params.slug)),
  head: ({ loaderData }) => {
    const name = loaderData?.settings.storeName ?? "Catálogo";
    const tagline =
      loaderData?.settings.storeTagline ?? "Escolha os produtos e finalize o pedido pelo WhatsApp.";
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
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [availability, setAvailability] = useState<ProductAvailability | "all">("all");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const categories = data.categories ?? [];
  const visibleProducts = useMemo(
    () =>
      data.products.filter((product) => {
        if (categoryId !== "all" && product.category_id !== categoryId) return false;
        if (onSaleOnly && !product.on_sale) return false;
        if (availability !== "all" && product.availability !== availability) return false;
        return true;
      }),
    [data.products, categoryId, onSaleOnly, availability],
  );
  const filtersActive = categoryId !== "all" || onSaleOnly || availability !== "all";

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
    <div
      className="min-h-screen bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
      style={brandingStyle(data.company)}
    >
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:flex sm:px-5 sm:py-5 sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {data.company.logoUrl ? (
              <img
                src={data.company.logoUrl}
                alt={`Logo ${data.company.name}`}
                className="h-11 w-11 shrink-0 rounded-xl object-cover sm:h-12 sm:w-12"
              />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary sm:h-12 sm:w-12 text-secondary-foreground">
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">
                {data.settings.storeName}
              </h1>
              <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground sm:mt-1 sm:text-sm">
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

      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-5 sm:py-4">
          {categories.length > 0 && (
            <ChipRow label="Filtrar por categoria">
              {[{ id: "all", name: "Todas" }, ...categories].map((category) => (
                <Chip
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </Chip>
              ))}
            </ChipRow>
          )}

          <ChipRow label="Filtrar por promoção e disponibilidade" className="mt-2">
            <Chip active={onSaleOnly} onClick={() => setOnSaleOnly((value) => !value)}>
              🔥 Promoção
            </Chip>
            {(["all", "pronta_entrega", "sob_encomenda"] as const).map((value) => (
              <Chip
                key={value}
                active={availability === value}
                onClick={() => setAvailability(value)}
              >
                {value === "all" ? "Todos" : AVAILABILITY_LABEL[value]}
              </Chip>
            ))}
          </ChipRow>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-muted-foreground">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1 ? "produto" : "produtos"}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setCategoryId("all");
                  setOnSaleOnly(false);
                  setAvailability("all");
                }}
                className="shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-6">


        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <h2 className="text-lg font-semibold">Nenhum produto disponível</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filtersActive
                ? "Nenhum produto encontrado com esses filtros. Tente ajustar a categoria, a promoção ou a disponibilidade."
                : "Volte em breve: o catálogo está sendo atualizado."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const actions = cartActions(product);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantityOf(product.id)}
                  onClick={() => setSelectedProduct(product)}
                  {...actions}
                />
              );
            })}
          </div>
        )}
      </main>

      <CartBar slug={slug} count={count} />

      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        quantity={selectedProduct ? quantityOf(selectedProduct.id) : 0}
        onAdd={() => {
          if (selectedProduct) {
            cartActions(selectedProduct).onAdd();
          }
        }}
        onIncrement={() => {
          if (selectedProduct) {
            cartActions(selectedProduct).onIncrement();
          }
        }}
        onDecrement={() => {
          if (selectedProduct) {
            cartActions(selectedProduct).onDecrement();
          }
        }}
      />
    </div>
  );
}

function ChipRow({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        role="group"
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {children}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden"
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 shrink-0 snap-start whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors sm:min-h-10 sm:px-4 sm:text-sm ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
