import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { generateProductCopy } from "@/lib/ai.functions";
import {
  uploadProductImage,
  useCategories,
  useMyCompany,
  useSaveProduct,
  type AdminProduct,
  type ProductAvailability,
} from "@/lib/admin-data";
import { AVAILABILITY_LABEL } from "@/lib/price";

export function ProductForm({ product }: { product?: AdminProduct }) {
  const navigate = useNavigate();
  const save = useSaveProduct();
  const generate = useServerFn(generateProductCopy);
  const categories = useCategories();
  const { data: company } = useMyCompany();

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? null);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(product?.sort_order ?? 999);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [onSale, setOnSale] = useState(product?.on_sale ?? false);
  const [availability, setAvailability] = useState<ProductAvailability>(
    product?.availability ?? "pronta_entrega",
  );
  const [brief, setBrief] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleUpload(file: File) {
    if (!company) {
      toast.error("Sua conta não está vinculada a nenhuma empresa.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductImage(file, company.id);
      setImageUrl(url);
      toast.success("Foto enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    const prompt = brief.trim() || title.trim();
    if (prompt.length < 3) {
      toast.error("Descreva o produto em poucas palavras para a IA ajudar.");
      return;
    }
    setGenerating(true);
    try {
      const copy = await generate({ data: { brief: prompt } });
      setTitle(copy.title || title);
      setDescription(copy.commercialDescription || copy.shortDescription || description);
      toast.success("Sugestão aplicada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o texto");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Informe o nome do produto");
      return;
    }
    if (!categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }
    const normalizedPrice = price.trim().replace(",", ".");
    const parsedPrice = normalizedPrice === "" ? null : Number(normalizedPrice);
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      toast.error("Informe um valor válido, ou deixe em branco");
      return;
    }
    try {
      await save.mutateAsync({
        id: product?.id,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        is_active: isActive,
        category_id: categoryId,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 999,
        price: parsedPrice,
        on_sale: onSale,
        availability,
      });
      toast.success(product ? "Produto atualizado" : "Produto criado");
      void navigate({ to: "/admin/produtos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o produto");
    }
  }

  return (
    <form className="flex max-w-xl flex-col gap-5" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <Label htmlFor="brief" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Auxílio de IA
        </Label>
        <Textarea
          id="brief"
          rows={2}
          placeholder="Ex: bolo de cenoura caseiro com cobertura de chocolate, tamanho família"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? "Gerando..." : "Gerar título e descrição"}
        </Button>
      </section>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Nome do produto</Label>
        <Input
          id="title"
          className="h-12"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category" className="h-12">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.data && categories.data.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma categoria cadastrada. Crie uma em Admin &gt; Categorias.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="photo">Foto</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <ImagePlus className="h-5 w-5" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="h-12 py-2.5 file:mr-3 file:h-full"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {uploading
                ? "Enviando foto..."
                : "Tire uma foto ou escolha da galeria. JPG ou PNG, proporção quadrada fica melhor."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor="price">Valor (opcional)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="price"
              inputMode="decimal"
              placeholder="0,00"
              className="h-12 pl-10"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe em branco para mostrar “sob consulta”. O WhatsApp não inclui o valor.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:w-48 sm:shrink-0">
          <Label htmlFor="availability">Disponibilidade</Label>
          <Select
            value={availability}
            onValueChange={(value) => setAvailability(value as ProductAvailability)}
          >
            <SelectTrigger id="availability" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AVAILABILITY_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Em promoção</p>
          <p className="text-xs text-muted-foreground">
            Destaca o produto com um selo de promoção no catálogo.
          </p>
        </div>
        <Switch checked={onSale} onCheckedChange={setOnSale} />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Produto ativo</p>
          <p className="text-xs text-muted-foreground">Inativo não aparece no catálogo público.</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sort">Posição na vitrine</Label>
        <Input
          id="sort"
          type="number"
          min={1}
          className="h-12"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" className="h-12 flex-1 rounded-full" disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar produto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-full sm:w-auto"
          onClick={() => void navigate({ to: "/admin/produtos" })}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
