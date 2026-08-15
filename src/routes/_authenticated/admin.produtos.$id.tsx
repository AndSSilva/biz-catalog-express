import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAdminProduct } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  head: () => ({
    meta: [
      { title: "Editar produto — Catálogo" },
      { name: "description", content: "Edite as informações do produto." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Editar produto" },
      { property: "og:description", content: "Edite as informações do produto." },
    ],
  }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useAdminProduct(id);

  return (
    <AdminShell title="Editar produto">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando produto...</p>}
      {isError && <p className="text-sm text-destructive">Produto não encontrado.</p>}
      {data && <ProductForm product={data} />}
    </AdminShell>
  );
}
