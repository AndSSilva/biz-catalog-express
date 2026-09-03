export type CompanyBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string) {
  return HEX.test(value.trim());
}

function expand(hex: string) {
  const clean = hex.trim().replace("#", "");
  return clean.length === 3
    ? clean
        .split("")
        .map((char) => char + char)
        .join("")
    : clean;
}

/** Luminância relativa para escolher texto claro ou escuro sobre a cor. */
function luminance(hex: string) {
  const value = expand(hex);
  const channels = [0, 2, 4].map((offset) => {
    const part = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastForeground(hex: string) {
  return luminance(hex) > 0.5 ? "#1a1614" : "#ffffff";
}

/**
 * Variáveis do design system sobrescritas com a paleta da empresa.
 * Aplicadas no elemento que envolve o catálogo/admin daquela empresa.
 *
 * `includeSurface` controla se a cor de fundo/letra personalizadas entram —
 * elas são pensadas só para o catálogo público, não para a área administrativa.
 */
export function brandingStyle(
  branding: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor?: string;
    textColor?: string;
  },
  options: { includeSurface?: boolean } = {},
): React.CSSProperties {
  const includeSurface = options.includeSurface ?? true;
  const primary = isHexColor(branding.primaryColor) ? branding.primaryColor : null;
  const secondary = isHexColor(branding.secondaryColor) ? branding.secondaryColor : null;
  const background =
    includeSurface && branding.backgroundColor && isHexColor(branding.backgroundColor)
      ? branding.backgroundColor
      : null;
  const text =
    includeSurface && branding.textColor && isHexColor(branding.textColor)
      ? branding.textColor
      : null;

  return {
    ...(primary
      ? {
          ["--primary" as string]: primary,
          ["--primary-foreground" as string]: contrastForeground(primary),
          ["--ring" as string]: primary,
        }
      : {}),
    ...(secondary
      ? {
          ["--secondary" as string]: secondary,
          ["--secondary-foreground" as string]: contrastForeground(secondary),
        }
      : {}),
    ...(background
      ? {
          ["--background" as string]: background,
        }
      : {}),
    ...(text
      ? {
          ["--foreground" as string]: text,
        }
      : {}),
  } as React.CSSProperties;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
