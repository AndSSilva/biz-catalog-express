import { createFileRoute } from "@tanstack/react-router";
import { Ruler } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { useMyCompany } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/medidas")({
  head: () => ({
    meta: [
      { title: "Medidas e tamanhos — Catálogo" },
      {
        name: "description",
        content: "Cadastro de medidas e tamanhos da empresa.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeasurementsPage,
});

function MeasurementsPage() {
  const { data: company, isLoading: loadingCompany } = useMyCompany();

  return (
    <AdminShell title="Medidas e tamanhos">
      {loadingCompany ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !company?.sizeMeasurementEnabled ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Ruler className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">
            Cadastro de medidas e tamanhos não habilitado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com o responsável pela plataforma para habilitar essa funcionalidade para a sua
            empresa.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Ruler className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Medidas e tamanhos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O cadastro de medidas e tamanhos será disponibilizado aqui.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
