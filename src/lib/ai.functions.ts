import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  brief: z.string().min(3).max(600),
});

export type ProductCopy = {
  title: string;
  shortDescription: string;
  commercialDescription: string;
};

/**
 * Gera sugestões de título e descrição para um produto.
 * Desacoplado: só este handler conhece o provedor de IA.
 */
export const generateProductCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Acesso restrito ao administrador.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de IA não configurado.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          {
            role: "system",
            content:
              "Você escreve textos de catálogo em português do Brasil. Responda SOMENTE com JSON no formato " +
              '{"title": string, "shortDescription": string, "commercialDescription": string}. ' +
              "title: até 60 caracteres. shortDescription: uma frase objetiva de até 140 caracteres. " +
              "commercialDescription: até 320 caracteres, tom comercial e direto, sem inventar preço, estoque ou promessas.",
          },
          { role: "user", content: data.brief },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      throw new Error("Não foi possível gerar as sugestões agora. Tente novamente.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as ProductCopy;
      return {
        title: String(parsed.title ?? "").slice(0, 120),
        shortDescription: String(parsed.shortDescription ?? "").slice(0, 300),
        commercialDescription: String(parsed.commercialDescription ?? "").slice(0, 600),
      } satisfies ProductCopy;
    } catch {
      console.error("AI parse error", raw);
      throw new Error("A IA respondeu em formato inesperado. Tente novamente.");
    }
  });
