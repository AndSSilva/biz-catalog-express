import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useIsMaster } from "@/lib/admin-data";
import { slugify } from "@/lib/branding";
import {
  useCreateCompanyAdmin,
  useDeleteCompany,
  useMasterCompanies,
  useSaveCompany,
  useToggleCompanyActive,
} from "@/lib/master-data";

import type { MasterCompany } from "@/lib/master.functions";

export const Route = createFileRoute("/_authenticated/master/")({
  head: () => ({
    meta: [
      { title: "Empresas da plataforma" },
      { name: "description", content: "Gestão interna das empresas da plataforma." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Empresas da plataforma" },
      { property: "og:description", content: "Gestão interna das empresas." },
    ],
  }),
  component: MasterPage,
});

const DEFAULT_PRIMARY = "#b8451f";
const DEFAULT_SECONDARY = "#1f6f5c";

function MasterPage() {
  const navigate = useNavigate();
  const { data: isMaster, isLoading } = useIsMaster();
  const companies = useMasterCompanies();
  const toggleActive = useToggleCompanyActive();

  const [companyForm, setCompanyForm] = useState<MasterCompany | "new" | null>(null);
  const [adminFor, setAdminFor] = useState<MasterCompany | null>(null);
  const [deleteFor, setDeleteFor] = useState<MasterCompany | null>(null);


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isMaster) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Esta conta não tem acesso a esta área.</p>
        <Button
          variant="outline"
          className="h-12 rounded-full px-6"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/master/login" });
          }}
        >
          Sair
        </Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold">Empresas</h1>
              <p className="text-xs text-muted-foreground">Administração da plataforma</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-11 shrink-0 rounded-full"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/master/login" });
            }}
          >
            <LogOut className="mr-1 h-4 w-4" aria-hidden />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {companies.data?.length ?? 0} empresa(s) cadastrada(s)
          </p>
          <Button
            className="h-12 w-full rounded-full px-5 sm:w-auto"
            onClick={() => setCompanyForm("new")}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Nova empresa
          </Button>
        </div>

        {companies.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando empresas...</p>
        ) : companies.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as empresas.</p>
        ) : (companies.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">Nenhuma empresa ainda</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre a primeira empresa para gerar o catálogo dela.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {(companies.data ?? []).map((company) => (
              <li
                key={company.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={`Logo ${company.name}`}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{company.name}</p>
                  <p className="truncate text-xs text-muted-foreground">/{company.slug}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ background: company.primaryColor }}
                      title={`Cor primária ${company.primaryColor}`}
                    />
                    <span
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ background: company.secondaryColor }}
                      title={`Cor secundária ${company.secondaryColor}`}
                    />
                    <span className="text-xs break-words text-muted-foreground">
                      {company.admins.length} admin(s)
                      {company.admins.length > 0
                        ? `: ${company.admins.map((admin) => admin.email).join(", ")}`
                        : ""}
                    </span>
                  </div>
                </div>

                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Switch
                      checked={company.isActive}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate(
                          { id: company.id, isActive: checked },
                          {
                            onSuccess: () =>
                              toast.success(checked ? "Empresa ativada" : "Empresa desativada"),
                            onError: () => toast.error("Não foi possível alterar o status"),
                          },
                        )
                      }
                      aria-label={`Ativar ${company.name}`}
                    />
                    {company.isActive ? "Ativa" : "Inativa"}
                  </label>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full"
                    onClick={() => setCompanyForm(company)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full"
                    onClick={() => setAdminFor(company)}
                  >
                    <UserPlus className="mr-1 h-4 w-4" aria-hidden />
                    Admin
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full text-destructive hover:text-destructive"
                    onClick={() => setDeleteFor(company)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                    Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <CompanyDialog company={companyForm} onClose={() => setCompanyForm(null)} />
      <AdminDialog company={adminFor} onClose={() => setAdminFor(null)} />
      <DeleteCompanyDialog company={deleteFor} onClose={() => setDeleteFor(null)} />

    </div>
  );
}

function CompanyDialog({
  company,
  onClose,
}: {
  company: MasterCompany | "new" | null;
  onClose: () => void;
}) {
  const editing = company && company !== "new" ? company : null;
  const save = useSaveCompany();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [isActive, setIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [key, setKey] = useState<string | null>(null);

  // Sincroniza o formulário quando outra empresa é aberta.
  const currentKey = company === "new" ? "new" : (editing?.id ?? null);
  if (company && currentKey !== key) {
    setKey(currentKey);
    setName(editing?.name ?? "");
    setSlug(editing?.slug ?? "");
    setPrimaryColor(editing?.primaryColor ?? DEFAULT_PRIMARY);
    setSecondaryColor(editing?.secondaryColor ?? DEFAULT_SECONDARY);
    setIsActive(editing?.isActive ?? true);
    setLogoFile(null);
  }

  return (
    <Dialog open={Boolean(company)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>
            O catálogo público fica em /{slug || "endereco-da-empresa"}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(
              {
                ...(editing ? { id: editing.id } : {}),
                name: name.trim(),
                slug: slugify(slug || name),
                primaryColor,
                secondaryColor,
                isActive,
                logoFile,
              },
              {
                onSuccess: () => {
                  toast.success(editing ? "Empresa atualizada" : "Empresa criada");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao salvar"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="company-name">Nome da empresa</Label>
            <Input
              id="company-name"
              required
              className="h-12"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!editing) setSlug(slugify(event.target.value));
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-slug">Endereço do catálogo</Label>
            <Input
              id="company-slug"
              required
              className="h-12"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="company-primary">Cor primária</Label>
              <Input
                id="company-primary"
                type="color"
                className="h-12 p-1"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="company-secondary">Cor secundária</Label>
              <Input
                id="company-secondary"
                type="color"
                className="h-12 p-1"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-logo">Logo (PNG ou JPG, até 2 MB)</Label>
            <Input
              id="company-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="h-12"
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            />
            {editing?.logoUrl && !logoFile ? (
              <p className="text-xs text-muted-foreground">
                A logo atual é mantida se nenhum arquivo for escolhido.
              </p>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Empresa ativa</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminDialog({
  company,
  onClose,
}: {
  company: MasterCompany | null;
  onClose: () => void;
}) {
  const create = useCreateCompanyAdmin();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Dialog
      open={Boolean(company)}
      onOpenChange={(open) => {
        if (!open) {
          setFullName("");
          setEmail("");
          setPassword("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo administrador</DialogTitle>
          <DialogDescription>
            A conta terá acesso apenas aos dados de {company?.name ?? "empresa"}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!company) return;
            create.mutate(
              {
                companyId: company.id,
                fullName: fullName.trim(),
                email: email.trim(),
                password,
              },
              {
                onSuccess: () => {
                  toast.success("Administrador criado");
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao criar a conta"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-name">Nome</Label>
            <Input
              id="admin-name"
              required
              className="h-12"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              required
              className="h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-password">Senha provisória (mínimo 8 caracteres)</Label>
            <Input
              id="admin-password"
              type="text"
              required
              minLength={8}
              className="h-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={create.isPending}>
              {create.isPending ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCompanyDialog({
  company,
  onClose,
}: {
  company: MasterCompany | null;
  onClose: () => void;
}) {
  const remove = useDeleteCompany();
  const [confirm, setConfirm] = useState("");

  return (
    <Dialog
      open={Boolean(company)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirm("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover empresa</DialogTitle>
          <DialogDescription>
            Esta ação apaga definitivamente produtos, categorias, pedidos, configurações e as contas
            de administrador de {company?.name ?? "empresa"}. Para apenas esconder o catálogo, use a
            chave "Ativa".
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!company) return;
            remove.mutate(
              { id: company.id, confirmSlug: confirm.trim() },
              {
                onSuccess: () => {
                  toast.success("Empresa removida");
                  setConfirm("");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao remover"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm">
              Digite <span className="font-semibold">{company?.slug}</span> para confirmar
            </Label>
            <Input
              id="delete-confirm"
              required
              autoComplete="off"
              className="h-12"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-12 rounded-full px-6"
              disabled={remove.isPending || confirm.trim() !== company?.slug}
            >
              {remove.isPending ? "Removendo..." : "Remover definitivamente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
