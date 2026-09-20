import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Package, Plus, Ruler, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminProducts, useMyCompany } from "@/lib/admin-data";
import {
  useCompanyMeasurements,
  useDeleteCompanyMeasurement,
  useMeasurementProductIds,
  useSaveCompanyMeasurement,
  useSetMeasurementProducts,
  type CompanyMeasurement,
} from "@/lib/measurement-data";

export const Route = createFileRoute("/_authenticated/admin/medidas")({
  head: () => ({
    meta: [
      { title: "Medidas — Catálogo" },
      { name: "description", content: "Cadastro de medidas e tamanhos da empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeasurementsPage,
});

function MeasurementsPage() {
  const { data: company, isLoading: loadingCompany } = useMyCompany();
  const { data: measurements, isLoading: loadingMeasurements } = useCompanyMeasurements();
  const save = useSaveCompanyMeasurement();
  const remove = useDeleteCompanyMeasurement();
  const [label, setLabel] = useState("");
  const [linking, setLinking] = useState<CompanyMeasurement | null>(null);

  async function addMeasurement(event: React.FormEvent) {
    event.preventDefault();
    const next = label.trim();
    if (!next) return;
    const nextSortOrder = (measurements?.length ?? 0) * 10;
    try {
      await save.mutateAsync({ label: next, sort_order: nextSortOrder });
      setLabel("");
      toast.success("Medida adicionada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar a medida");
    }
  }

  async function moveMeasurement(list: CompanyMeasurement[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    if (!a || !b) return;
    try {
      await Promise.all([
        save.mutateAsync({ id: a.id, label: a.label, sort_order: b.sort_order }),
        save.mutateAsync({ id: b.id, label: b.label, sort_order: a.sort_order }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reordenar");
    }
  }

  async function handleDelete(measurement: CompanyMeasurement) {
    try {
      await remove.mutateAsync(measurement.id);
      toast.success("Medida removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a medida");
    }
  }

  if (loadingCompany) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  const list = measurements ?? [];

  return (
    <AdminShell title="Medidas">
      {!company?.sizeMeasurementEnabled ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Ruler className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Controle de medidas não habilitado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com o responsável pela plataforma para habilitar essa funcionalidade para a sua
            empresa.
          </p>
        </div>
      ) : (
        <div className="flex max-w-xl flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold">Medidas e tamanhos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre as opções que poderão ser vinculadas aos produtos — um produto pode ter mais
              de uma medida.
            </p>
          </div>

          <form className="flex gap-2" onSubmit={addMeasurement}>
            <Input
              className="h-12"
              placeholder="Ex.: P, M, G, 38 ou 40"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <Button
              type="submit"
              className="h-12 shrink-0 rounded-full px-5"
              disabled={save.isPending}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Adicionar
            </Button>
          </form>

          {loadingMeasurements ? (
            <p className="text-sm text-muted-foreground">Carregando medidas...</p>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <Ruler className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma medida cadastrada ainda.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((measurement, index) => (
                <li
                  key={measurement.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <span className="w-full font-medium sm:w-auto sm:flex-1">
                    {measurement.label}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full border-border bg-background text-foreground hover:bg-accent"
                    onClick={() => setLinking(measurement)}
                  >
                    <Package className="mr-1.5 h-4 w-4" aria-hidden />
                    Vincular produtos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    disabled={index === 0 || save.isPending}
                    onClick={() => void moveMeasurement(list, index, -1)}
                    aria-label={`Mover ${measurement.label} para cima`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    disabled={index === list.length - 1 || save.isPending}
                    onClick={() => void moveMeasurement(list, index, 1)}
                    aria-label={`Mover ${measurement.label} para baixo`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-destructive hover:text-destructive"
                    disabled={remove.isPending}
                    onClick={() => void handleDelete(measurement)}
                    aria-label={`Excluir ${measurement.label}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <LinkProductsDialog measurement={linking} onClose={() => setLinking(null)} />
    </AdminShell>
  );
}

function LinkProductsDialog({
  measurement,
  onClose,
}: {
  measurement: CompanyMeasurement | null;
  onClose: () => void;
}) {
  const { data: products, isLoading: loadingProducts } = useAdminProducts();
  const { data: linkedIds, isLoading: loadingLinks } = useMeasurementProductIds(
    measurement?.id ?? null,
  );
  const setProducts = useSetMeasurementProducts();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelected(new Set(linkedIds ?? []));
  }, [linkedIds, measurement?.id]);

  useEffect(() => {
    if (!measurement) setSearch("");
  }, [measurement]);

  const list = (products ?? []).filter((product) =>
    product.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function handleSave() {
    if (!measurement) return;
    try {
      await setProducts.mutateAsync({
        measurementId: measurement.id,
        productIds: Array.from(selected),
      });
      toast.success(`Produtos com "${measurement.label}" atualizados`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o vínculo");
    }
  }

  const loading = loadingProducts || loadingLinks;

  return (
    <Dialog open={Boolean(measurement)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular produtos a "{measurement?.label}"</DialogTitle>
          <DialogDescription>
            Marque todos os produtos que têm essa medida. Isso substitui a lista atual — produtos
            desmarcados perdem essa medida específica (as outras medidas deles não mudam).
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 shrink-0"
        />

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando produtos...</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((product) => (
                <li key={product.id}>
                  <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-accent">
                    <Checkbox
                      checked={selected.has(product.id)}
                      onCheckedChange={() => toggle(product.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{product.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full"
            disabled={setProducts.isPending || loading}
            onClick={() => void handleSave()}
          >
            {setProducts.isPending
              ? "Salvando..."
              : `Salvar (${selected.size} ${selected.size === 1 ? "produto" : "produtos"})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
