import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveSettings, useSettings } from "@/lib/admin-data";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/admin/config")({
  head: () => ({
    meta: [
      { title: "Configurações — Catálogo" },
      { name: "description", content: "Número de WhatsApp e identidade do catálogo." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Configurações do catálogo" },
      { property: "og:description", content: "Número de WhatsApp e textos da loja." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings();

  const [form, setForm] = useState({
    whatsapp_number: "",
    greeting: "",
    store_name: "",
    store_tagline: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      whatsapp_number: data.get("whatsapp_number") ?? "",
      greeting: data.get("greeting") ?? "",
      store_name: data.get("store_name") ?? "",
      store_tagline: data.get("store_tagline") ?? "",
    });
  }, [data]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const digits = normalizeWhatsappNumber(form.whatsapp_number);
    if (digits.length < 10) {
      toast.error("Informe o WhatsApp com DDI e DDD. Ex: 5511999999999");
      return;
    }
    try {
      await save.mutateAsync({ ...form, whatsapp_number: digits });
      toast.success("Configurações salvas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar configurações");
    }
  }

  return (
    <AdminShell title="Configurações">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <form
          className="flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-5"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">WhatsApp do negócio (com DDI e DDD)</Label>
            <Input
              id="whatsapp"
              inputMode="tel"
              placeholder="5511999999999"
              className="h-12"
              value={form.whatsapp_number}
              onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="greeting">Primeira linha da mensagem</Label>
            <Textarea
              id="greeting"
              rows={2}
              value={form.greeting}
              onChange={(event) => setForm({ ...form, greeting: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="store_name">Nome exibido no catálogo</Label>
            <Input
              id="store_name"
              className="h-12"
              value={form.store_name}
              onChange={(event) => setForm({ ...form, store_name: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="store_tagline">Frase de apoio</Label>
            <Input
              id="store_tagline"
              className="h-12"
              value={form.store_tagline}
              onChange={(event) => setForm({ ...form, store_tagline: event.target.value })}
            />
          </div>

          <Button type="submit" className="h-12 rounded-full" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      )}
    </AdminShell>
  );
}
