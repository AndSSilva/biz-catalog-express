import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Sparkles, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
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

const MAX_IMAGES = 6;

export function ProductForm({ product }: { product?: AdminProduct }) {
  const navigate = useNavigate();
  const save = useSaveProduct();
  const generate = useServerFn(generateProductCopy);
  const categories = useCategories();
  const { data: company } = useMyCompany();

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(product?.sort_order ?? 999);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [onSale, setOnSale] = useState(product?.on_sale ?? false);
  const [availability, setAvailability] = useState<ProductAvailability>(
    product?.availability ?? "pronta_entrega",
  );
  const [stockQuantity, setStockQuantity] = useState(() => {
    if (product) return product.stock_quantity;
    return availability === "pronta_entrega" ? 1 : 0;
  });
  const [showStockInCatalog, setShowStockInCatalog] = useState(
    product?.show_stock_in_catalog ?? false,
  );
  const [brief, setBrief] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (!company) {
      toast.error("Sua conta não está vinculada a nenhuma empresa.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      toast.error(`Máximo de ${MAX_IMAGES} fotos por produto.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductImage(file, company.id);
      setImages((current) => [...current, url]);
      toast.success("Foto enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a foto");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
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
        images,
        is_active: isActive,
        category_id: categoryId,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 999,
        price: parsedPrice,
        on_sale: onSale,
        availability,
        stock_quantity: availability === "sob_encomenda" ? 0 : stockQuantity,
        show_stock_in_catalog: availability === "sob_encomenda" ? false : showStockInCatalog,
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
        <Label htmlFor="photo">
          Fotos {images.length > 0 && `(${images.length}/${MAX_IMAGES})`}
        </Label>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((url, index) => (
              <div key={url} className="relative h-24 w-24 shrink-0">
                <img src={url} alt="" className="h-full w-full rounded-xl object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-semibold text-white">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  aria-label="Remover foto"
                  className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {images.length === 0 && (
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <ImagePlus className="h-5 w-5" aria-hidden />
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <input
              ref={fileInputRef}
              id="photo"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading || images.length >= MAX_IMAGES}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={uploading || images.length >= MAX_IMAGES}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full"
                disabled={uploading || images.length >= MAX_IMAGES}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" aria-hidden />
                Tirar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full"
                disabled={uploading || images.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Enviar arquivo
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {uploading
                ? "Enviando foto..."
                : images.length >= MAX_IMAGES
                  ? `Limite de ${MAX_IMAGES} fotos atingido. Remova uma para adicionar outra.`
                  : "Adicione quantas fotos quiser (até 6). A primeira é usada como capa nas listagens; o cliente vê todas no catálogo."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start">
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
            onValueChange={(value) => {
              const next = value as ProductAvailability;
              setAvailability(next);
              if (next === "sob_encomenda") {
                setStockQuantity(0);
                setShowStockInCatalog(false);
              } else if (stockQuantity === 0) {
                setStockQuantity(1);
              }
            }}
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

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:max-w-[220px]">
          <Label htmlFor="stock">Quantidade em estoque</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              disabled={availability === "sob_encomenda" || stockQuantity <= 1}
              onClick={() => setStockQuantity((value) => Math.max(1, value - 1))}
              aria-label="Diminuir quantidade em estoque"
            >
              −
            </Button>
            <Input
              id="stock"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              className="h-11 text-center"
              disabled={availability === "sob_encomenda"}
              value={stockQuantity}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (!Number.isFinite(parsed)) return;
                setStockQuantity(Math.min(999, Math.max(1, Math.round(parsed))));
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              disabled={availability === "sob_encomenda" || stockQuantity >= 999}
              onClick={() => setStockQuantity((value) => Math.min(999, value + 1))}
              aria-label="Aumentar quantidade em estoque"
            >
              +
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {availability === "sob_encomenda"
              ? "Sob encomenda não usa controle de estoque."
              : "De 1 a 999 unidades."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Mostrar estoque no catálogo</p>
            <p className="text-xs text-muted-foreground">
              Exibe a quantidade disponível (ou "Esgotado") para o cliente.
            </p>
          </div>
          <Switch
            checked={showStockInCatalog}
            disabled={availability === "sob_encomenda"}
            onCheckedChange={setShowStockInCatalog}
          />
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
