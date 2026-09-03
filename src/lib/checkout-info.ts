const KEY = "catalogo.checkout-info.v1";

export type SavedCheckoutInfo = {
  customerName: string;
  customerPhone: string;
};

/** Lê o nome/telefone informados da última vez, se houver (conveniência, não obrigatório). */
export function readSavedCheckoutInfo(): SavedCheckoutInfo {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { customerName: "", customerPhone: "" };
    const parsed = JSON.parse(raw) as Partial<SavedCheckoutInfo>;
    return {
      customerName: typeof parsed.customerName === "string" ? parsed.customerName : "",
      customerPhone: typeof parsed.customerPhone === "string" ? parsed.customerPhone : "",
    };
  } catch {
    return { customerName: "", customerPhone: "" };
  }
}

export function saveCheckoutInfo(info: SavedCheckoutInfo) {
  try {
    localStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    // armazenamento indisponível (modo privado) — só não lembra da próxima vez
  }
}
