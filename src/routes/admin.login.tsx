import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Acesso do administrador — Catálogo" },
      { name: "description", content: "Área restrita para gerenciar produtos e pedidos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso do administrador" },
      { property: "og:description", content: "Área restrita do catálogo." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin/login` },
        });
        if (error) throw error;
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          await supabase.rpc("claim_admin");
          toast.success("Conta criada. Bem-vindo!");
          void navigate({ to: "/admin" });
          return;
        }
        toast.success("Conta criada. Confirme o e-mail para entrar.");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await supabase.rpc("claim_admin");
      void navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">Área do administrador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Entre para gerenciar produtos e pedidos."
            : "Crie a conta do dono do negócio."}
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              className="h-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" className="h-12 rounded-full text-base" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Primeiro acesso? Criar conta" : "Já tenho conta. Entrar"}
        </button>
      </div>
    </main>
  );
}
