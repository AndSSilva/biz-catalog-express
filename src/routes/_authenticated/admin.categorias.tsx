import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCategories,
  useCategoryProductCounts,
  useDeleteCategory,
  useMoveCategoryProducts,
  useSaveCategory,
  type Category,
} from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Catálogo" },
      { name: "description", content: "Crie, edite e exclua as categorias dos produtos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Categorias do catálogo" },
      { property: "og:description", content: "Gerencie as categorias dos produtos." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data, isLoading, isError } = useCategories();
  const counts = useCategoryProductCounts();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const move = useMoveCategoryProducts();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [moveTarget, setMoveTarget] = useState("");

  const linkedCount = pendingDelete ? (counts.data?.get(pendingDelete.id) ?? 0) : 0;
  const otherCategories = (data ?? []).filter((category) => category.id !== pendingDelete?.id);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (newName.trim().length < 2) {
      toast.error("Informe o nome da categoria");
      return;
    }
    try {
      await save.mutateAsync({ name: newName.trim(), sort_order: (data?.length ?? 0) + 1 });
      setNewName("");
      toast.success("Categoria criada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a categoria");
    }
  }

  async function handleRename() {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      toast.error("Informe o nome da categoria");
      return;
    }
    const current = data?.find((category) => category.id === editing.id);
    try {
      await save.mutateAsync({
        id: editing.id,
        name: editing.name.trim(),
        sort_order: current?.sort_order ?? 0,
      });
      setEditing(null);
      toast.success("Categoria atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      if (linkedCount > 0) {
        if (!moveTarget) {
          toast.error("Escolha a categoria de destino dos produtos");
          return;
        }
        await move.mutateAsync({ fromId: pendingDelete.id, toId: moveTarget });
      }
      await remove.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
      setMoveTarget("");
      toast.success("Categoria removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover");
    }
  }

  return (
    <AdminShell title="Categorias">
      <form className="mb-5 flex flex-col gap-2" onSubmit={handleCreate}>
        <Label htmlFor="new-category">Nova categoria</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-category"
            className="h-12"
            placeholder="Ex: Bolos"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            type="submit"
            className="h-12 w-full shrink-0 rounded-full sm:w-auto"
            disabled={save.isPending}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Criar
          </Button>
        </div>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando categorias...</p>}
      {isError && <p className="text-sm text-destructive">Erro ao carregar as categorias.</p>}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Nenhuma categoria cadastrada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie a primeira categoria para poder vincular aos produtos.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {(data ?? []).map((category) => (
          <li
            key={category.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            {editing?.id === category.id ? (
              <>
                <Input
                  className="h-12 min-w-[10rem] flex-1"
                  value={editing.name}
                  onChange={(event) => setEditing({ id: category.id, name: event.target.value })}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  aria-label="Salvar nome"
                  disabled={save.isPending}
                  onClick={() => void handleRename()}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  aria-label="Cancelar edição"
                  onClick={() => setEditing(null)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-[8rem] flex-1">
                  <p className="text-sm font-semibold break-words">{category.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {counts.data?.get(category.id) ?? 0} produto(s) · {category.slug}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => setEditing({ id: category.id, name: category.name })}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full text-destructive"
                  aria-label={`Remover ${category.name}`}
                  onClick={() => {
                    setPendingDelete(category);
                    setMoveTarget("");
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setMoveTarget("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {linkedCount > 0
                ? `“${pendingDelete?.name}” tem ${linkedCount} produto(s) vinculado(s). Escolha para qual categoria esses produtos devem ir antes de excluir.`
                : `“${pendingDelete?.name}” será excluída.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {linkedCount > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="move-target">Mover produtos para</Label>
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger id="move-target" className="h-12">
                  <SelectValue placeholder="Selecione a categoria de destino" />
                </SelectTrigger>
                <SelectContent>
                  {otherCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {otherCategories.length === 0 && (
                <p className="text-xs text-destructive">
                  Crie outra categoria antes de excluir esta.
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending || move.isPending || (linkedCount > 0 && !moveTarget)}
              onClick={() => void handleDelete()}
            >
              Remover
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
