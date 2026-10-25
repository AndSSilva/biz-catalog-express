import { Link, createFileRoute, useBlocker } from "@tanstack/react-router";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useAdminProducts,
  useCategories,
  useDeleteProduct,
  useReorderProducts,
  useSaveProductSequence,
  useSaveCategoryProductSequence,
  useToggleActive,
  type AdminProduct,
} from "@/lib/admin-data";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/price";
import {
  UNCATEGORIZED,
  buildSequence,
  sameOrder,
  scopedProductSequence,
  type PrimaryCriterion,
  type SortCriterion,
} from "@/lib/product-sort";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  head: () => ({
    meta: [
      { title: "Produtos — Catálogo" },
      { name: "description", content: "Cadastre, edite, ative e reordene os produtos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Produtos do catálogo" },
      { property: "og:description", content: "Gerencie os produtos do catálogo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

const PRIMARY_OPTIONS: { value: PrimaryCriterion; label: string }[] = [
  { value: "manual", label: "Ordem manual" },
  { value: "category", label: "Categoria" },
  { value: "price_asc", label: "Preço crescente" },
  { value: "price_desc", label: "Preço decrescente" },
  { value: "name_asc", label: "Nome A–Z" },
  { value: "name_desc", label: "Nome Z–A" },
];
const SECONDARY_OPTIONS = PRIMARY_OPTIONS.filter((o) => o.value !== "category") as {
  value: SortCriterion;
  label: string;
}[];

function ProductsPage() {
  const { data, isLoading, isError, refetch } = useAdminProducts();
  const { data: categories = [] } = useCategories();
  const toggle = useToggleActive();
  const reorder = useReorderProducts();
  const saveSequence = useSaveProductSequence();
  const saveCategorySequence = useSaveCategoryProductSequence();
  const remove = useDeleteProduct();
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);

  // Modo de reorganização: cópia temporária + ordem original salva.
  const [draft, setDraft] = useState<AdminProduct[] | null>(null);
  const [original, setOriginal] = useState<AdminProduct[]>([]);
  const [manualEdited, setManualEdited] = useState(false);
  const [primary, setPrimary] = useState<PrimaryCriterion>("manual");
  const [secondary, setSecondary] = useState<SortCriterion>("manual");
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [scope, setScope] = useState("all");
  const [pendingScope, setPendingScope] = useState<string | null>(null);
  const saving = saveSequence.isPending || saveCategorySequence.isPending;

  const editing = draft !== null;
  const dirty = editing && !sameOrder(draft, original);
  const list = draft ?? data ?? [];

  const blocker = useBlocker({ shouldBlockFn: () => dirty, withResolver: true });
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const groupKey = (p: AdminProduct) =>
    p.category_id && categoryName.has(p.category_id) ? p.category_id : UNCATEGORIZED;

  function startEditing(nextScope = "all") {
    if (!data) return;
    const sequence = scopedProductSequence(data, nextScope === "all" ? null : nextScope);
    setScope(nextScope);
    setOriginal(sequence);
    setDraft(sequence);
    setManualEdited(false);
    setPrimary("manual");
    setSecondary("manual");
  }

  function exitEditing() {
    setDraft(null);
    setManualEdited(false);
    setPendingScope(null);
  }

  function changeScope(nextScope: string) {
    if (nextScope === scope) return;
    if (dirty) { setPendingScope(nextScope); setConfirmDiscard(true); }
    else startEditing(nextScope);
  }

  function cancelEditing() {
    if (dirty) setConfirmDiscard(true);
    else exitEditing();
  }

  function applySort(force = false) {
    if (!draft) return;
    if (primary === "manual") {
      toast.info("Ordem manual: arraste os produtos para organizar.");
      return;
    }
    if (manualEdited && !force) {
      setConfirmApply(true);
      return;
    }
    setDraft(buildSequence(draft, primary, secondary, categories));
    setManualEdited(false);
    toast.success("Ordenação aplicada. Ajuste à vontade e salve.");
  }

  function moveDraft(from: number, to: number) {
    if (!draft || to < 0 || to >= draft.length) return;
    setDraft(arrayMove(draft, from, to));
    setManualEdited(true);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!draft || saving || !over || active.id === over.id) return;
    const from = draft.findIndex((p) => p.id === active.id);
    const to = draft.findIndex((p) => p.id === over.id);
    moveDraft(from, to);
  }

  async function saveChanges() {
    if (!draft) return;
    try {
      const ids = draft.map((p) => p.id);
      if (scope === "all") await saveSequence.mutateAsync(ids);
      else await saveCategorySequence.mutateAsync({ categoryId: scope, ids });
      await refetch();
      exitEditing();
      toast.success("Nova ordem salva");
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "";
      if (message.includes("stale_sequence")) {
        toast.error(
          "Os produtos foram alterados em outro lugar. Cancele e entre de novo no modo de reorganização.",
        );
      } else {
        toast.error("Não foi possível salvar a nova ordem. Tente novamente.");
      }
    }
  }

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

  const showGroups = editing && primary === "category";

  return (
    <AdminShell title="Produtos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 basis-56 text-sm text-muted-foreground">
          {editing
            ? "Modo de reorganização: as mudanças só valem depois de salvar."
            : "A ordem abaixo é a mesma exibida no catálogo público."}
        </p>
        {!editing && (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-full"
              disabled={!data || data.length < 2}
              onClick={() => startEditing()}
            >
              <ListOrdered className="mr-1 h-4 w-4" aria-hidden />
              Reorganizar produtos
            </Button>
            <Button asChild className="h-11 rounded-full">
              <Link to="/admin/produtos/novo">
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                Novo
              </Link>
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <section className="mb-4 rounded-2xl border-2 border-primary bg-card p-4 shadow-sm">
          <label className="mb-4 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Ordenação em edição
            <Select value={scope} onValueChange={changeScope} disabled={saving}>
              <SelectTrigger className="h-11" aria-label="Ordenação em edição"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vitrine geral</SelectItem>
                {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-bold">Ordenação automática</h2>
            {dirty && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Alterações não salvas
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              1º critério (principal)
              <Select value={primary} onValueChange={(v) => setPrimary(v as PrimaryCriterion)} disabled={saving}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIMARY_OPTIONS.filter((o) => scope === "all" || o.value !== "category").map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              {primary === "category" ? "2º critério (dentro de cada categoria)" : "Desempate"}
              <Select
                value={primary === "category" ? secondary : "auto"}
                onValueChange={(v) => setSecondary(v as SortCriterion)}
                disabled={primary !== "category" || saving}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {primary !== "category" && (
                    <SelectItem value="auto">
                      {primary.startsWith("price") ? "Nome (automático)" : "Ordem atual"}
                    </SelectItem>
                  )}
                  {SECONDARY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button variant="secondary" className="h-11 rounded-full" onClick={() => applySort()} disabled={saving}>
              Aplicar ordenação
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Produtos sem preço ficam no final. Arraste pela alça ou use as setas para ajustar.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-full"
              onClick={() => void saveChanges()}
              disabled={!dirty || saving}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </section>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}
      {isError && <p className="text-sm text-destructive">Erro ao carregar os produtos.</p>}
      {editing && list.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Nenhum produto cadastrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o primeiro produto para o catálogo aparecer preenchido.
          </p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={list.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-3">
            {list.map((product, index) => {
              const prev = list[index - 1];
              const header =
                showGroups && (!prev || groupKey(prev) !== groupKey(product))
                  ? (categoryName.get(groupKey(product)) ?? "Sem categoria")
                  : null;
              return (
                <ProductRow
                  key={product.id}
                  product={product}
                  index={index}
                  total={list.length}
                  editing={editing}
                  groupHeader={header}
                  arrowsDisabled={editing ? saving : reorder.isPending}
                  onMove={(dir) =>
                    editing ? (!saving && moveDraft(index, index + dir)) : void move(index, dir)
                  }
                  onToggle={(checked) =>
                    toggle.mutate(
                      { id: product.id, isActive: checked },
                      {
                        onError: () => toast.error("Não foi possível alterar o status"),
                        onSuccess: () =>
                          toast.success(checked ? "Produto ativo" : "Produto inativo"),
                      },
                    )
                  }
                  onDelete={() => setPendingDelete(product)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <AlertDialog open={confirmApply} onOpenChange={setConfirmApply}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir a sequência atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Aplicar uma nova ordenação substituirá a sequência atual, incluindo os ajustes
              manuais ainda não salvos. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => applySort(true)}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDiscard || blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (open) return;
          setConfirmDiscard(false);
          setPendingScope(null);
          if (blocker.status === "blocked") blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              A nova ordem ainda não foi salva. Se continuar, ela será perdida e a ordem original
              volta a valer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                if (pendingScope !== null) { startEditing(pendingScope); setPendingScope(null); }
                else exitEditing();
                if (blocker.status === "blocked") blocker.proceed();
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function ProductRow({
  product,
  index,
  total,
  editing,
  groupHeader,
  arrowsDisabled,
  onMove,
  onToggle,
  onDelete,
}: {
  product: AdminProduct;
  index: number;
  total: number;
  editing: boolean;
  groupHeader: string | null;
  arrowsDisabled: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: product.id, disabled: !editing || arrowsDisabled });

  return (
    <>
      {groupHeader && (
        <li className="mt-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground first:mt-0">
          {groupHeader}
        </li>
      )}
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center ${
          isDragging
            ? "relative z-10 border-primary shadow-lg"
            : isOver && editing
              ? "border-primary"
              : editing
                ? "border-dashed border-primary/40"
                : "border-border"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {editing && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Arrastar ${product.title}`}
              className="flex h-16 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-accent active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5" aria-hidden />
            </button>
          )}
          <span
            className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
              editing ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}
            aria-label={`Posição ${index + 1}`}
          >
            {index + 1}
          </span>
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null}
            {product.images.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 rounded-full bg-foreground/60 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-background">
                +{product.images.length - 1}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold sm:truncate">{product.title}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-primary">
              {product.categories?.name ?? "Sem categoria"}
            </p>
            {!editing && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {product.description}
              </p>
            )}
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
              {product.availability === "pronta_entrega" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                    product.stock_quantity <= 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {product.stock_quantity} em estoque
                </span>
              )}
            </div>
            {!editing && (
              <div className="mt-2 flex items-center gap-2">
                <Switch
                  id={`active-${product.id}`}
                  checked={product.is_active}
                  onCheckedChange={onToggle}
                />
                <label htmlFor={`active-${product.id}`} className="text-xs text-muted-foreground">
                  {product.is_active ? "Ativo" : "Inativo"}
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:flex-col sm:items-stretch">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Mover para cima"
              disabled={index === 0 || arrowsDisabled}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Mover para baixo"
              disabled={index === total - 1 || arrowsDisabled}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {!editing && (
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
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      </li>
    </>
  );
}
