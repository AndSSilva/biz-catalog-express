import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyCompany } from "@/lib/admin-data";
import {
  useCompanyMeasurements,
  useDeleteCompanyMeasurement,
  useSaveCompanyMeasurement,
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
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <span className="min-w-0 flex-1 font-medium">{measurement.label}</span>
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
    </AdminShell>
  );
}
