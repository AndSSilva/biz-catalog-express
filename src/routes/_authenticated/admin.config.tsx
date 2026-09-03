import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    enable_delivery_selection: "false",
    store_address: "",
    store_maps_url: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      whatsapp_number: data.get("whatsapp_number") ?? "",
      greeting: data.get("greeting") ?? "",
      store_name: data.get("store_name") ?? "",
      store_tagline: data.get("store_tagline") ?? "",
      enable_delivery_selection: data.get("enable_delivery_selection") ?? "false",
      store_address: data.get("store_address") ?? "",
      store_maps_url: data.get("store_maps_url") ?? "",
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

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Permitir escolher forma de entrega</p>
              <p className="text-xs text-muted-foreground">
                Ao finalizar o pedido, o cliente escolhe entre retirada na loja ou tele-entrega.
              </p>
            </div>
            <Switch
              checked={form.enable_delivery_selection === "true"}
              onCheckedChange={(checked) =>
                setForm({ ...form, enable_delivery_selection: checked ? "true" : "false" })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="store_address">Endereço da loja (retirada)</Label>
            <Textarea
              id="store_address"
              rows={2}
              placeholder="Rua Exemplo, 123 — Bairro, Cidade/UF"
              value={form.store_address}
              onChange={(event) => setForm({ ...form, store_address: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Exibido no catálogo e mostrado ao cliente quando ele escolher retirada na loja.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="store_maps_url">Link do Google Maps (opcional)</Label>
            <Input
              id="store_maps_url"
              inputMode="url"
              className="h-12"
              placeholder="https://maps.app.goo.gl/..."
              value={form.store_maps_url}
              onChange={(event) => setForm({ ...form, store_maps_url: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Se preenchido, o endereço vira um link — o cliente toca e o Maps abre com a
              localização da loja. Copie o link direto do app ou site do Google Maps.
            </p>
          </div>

          <Button type="submit" className="h-12 rounded-full" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      )}
    </AdminShell>
  );
}
