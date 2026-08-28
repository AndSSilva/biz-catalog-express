import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useAdminProducts,
  useDeleteProduct,
  useReorderProducts,
  useToggleActive,
  type AdminProduct,
} from "@/lib/admin-data";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/price";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  head: () => ({
    meta: [
      { title: "Produtos — Catálogo" },
      { name: "description", content: "Cadastre, edite, ative e reordene os produtos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Produtos do catálogo" },
      { property: "og:description", content: "Gerencie os produtos do catálogo." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data, isLoading, isError } = useAdminProducts();
  const toggle = useToggleActive();
  const reorder = useReorderProducts();
  const remove = useDeleteProduct();
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);

  async function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    const item = next[index];
    if (!item) return;
    next.splice(index, 1);
    next.splice(target, 0, item);
    try {
      await reorder.mutateAsync(next.map((product, i) => ({ id: product.id, sort_order: i + 1 })));
    } catch {
      toast.error("Não foi possível salvar a nova ordem");
    }
  }

  return (
    <AdminShell title="Produtos">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          A ordem abaixo é a mesma exibida no catálogo público.
        </p>
        <Button asChild className="h-11 shrink-0 rounded-full">
          <Link to="/admin/produtos/novo">
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Novo
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}
      {isError && <p className="text-sm text-destructive">Erro ao carregar os produtos.</p>}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Nenhum produto cadastrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o primeiro produto para o catálogo aparecer preenchido.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {(data ?? []).map((product, index) => (
          <li
            key={product.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold sm:truncate">{product.title}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-primary">
                  {product.categories?.name ?? "Sem categoria"}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold">
                    {formatPrice(product.price) ?? "Sob consulta"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                    {AVAILABILITY_LABEL[product.availability]}
                  </span>
                  {product.on_sale && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">
                      Promoção
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Switch
                    id={`active-${product.id}`}
                    checked={product.is_active}
                    onCheckedChange={(checked) =>
                      toggle.mutate(
                        { id: product.id, isActive: checked },
                        {
                          onError: () => toast.error("Não foi possível alterar o status"),
                          onSuccess: () =>
                            toast.success(checked ? "Produto ativo" : "Produto inativo"),
                        },
                      )
                    }
                  />
                  <label htmlFor={`active-${product.id}`} className="text-xs text-muted-foreground">
                    {product.is_active ? "Ativo" : "Inativo"}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 sm:flex-col sm:items-stretch">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label="Mover para cima"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => void move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label="Mover para baixo"
                  disabled={index === (data?.length ?? 0) - 1 || reorder.isPending}
                  onClick={() => void move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label={`Editar ${product.title}`}
                >
                  <Link to="/admin/produtos/$id" params={{ id: product.id }}>
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-destructive"
                  aria-label={`Remover ${product.title}`}
                  onClick={() => setPendingDelete(product)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” será excluído do catálogo. Para apenas esconder do público,
              desative o produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                remove.mutate(pendingDelete.id, {
                  onSuccess: () => toast.success("Produto removido"),
                  onError: () => toast.error("Não foi possível remover o produto"),
                });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
