const inteiro = new Intl.NumberFormat("pt-BR")
const compacto = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const percentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function fmtInt(value: number | null | undefined) {
  return value == null ? "–" : inteiro.format(value)
}

export function fmtCompact(value: number | null | undefined) {
  return value == null ? "–" : compacto.format(value)
}

export function fmtPct(value: number | null | undefined) {
  return value == null ? "–" : `${percentual.format(value)}%`
}

export function fmtDelta(value: number | null | undefined, suffix = "") {
  if (value == null) return "–"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${percentual.format(Math.abs(value))}${suffix}`
}

export function fmtDeltaInt(value: number | null | undefined) {
  if (value == null) return "–"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${inteiro.format(Math.abs(value))}`
}

/**
 * Cores fixas para os partidos com mais votos, para que os maiores nunca
 * dividam a mesma cor. Os demais recebem uma cor da paleta por hash.
 */
const PARTY_COLORS: Record<string, string> = {
  PT: "var(--party-pt)",
  PL: "var(--party-pl)",
  PSD: "var(--chart-8)",
  MDB: "var(--chart-5)",
  REPUBLICANOS: "var(--chart-6)",
  PP: "var(--chart-3)",
  UNIÃO: "var(--chart-2)",
  PODE: "var(--chart-4)",
  PSOL: "var(--chart-7)",
  PSB: "var(--chart-1)",
}

const PALETTE_SIZE = 8

/** Cor estável por partido: o mesmo partido sempre recebe a mesma cor. */
export function partyColor(partido: string) {
  const fixed = PARTY_COLORS[partido]
  if (fixed) return fixed
  let hash = 0
  for (const char of partido) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `var(--chart-${(hash % PALETTE_SIZE) + 1})`
}

/**
 * Cores para fatias de um gráfico de setores: mantém a cor do partido quando
 * possível e troca por outra livre se dois partidos caírem na mesma cor.
 */
export function distinctPartyColors(partidos: string[]) {
  const used = new Set<string>()
  return partidos.map((partido) => {
    let color = partyColor(partido)
    if (used.has(color)) {
      for (let i = 1; i <= PALETTE_SIZE; i++) {
        const candidate = `var(--chart-${i})`
        if (!used.has(candidate)) {
          color = candidate
          break
        }
      }
    }
    used.add(color)
    return color
  })
}

export const OUTROS_COLOR = "var(--muted-foreground)"

/** Ordem que alterna matizes, para fatias vizinhas não ficarem parecidas. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-7)",
  "var(--chart-6)",
  "var(--chart-8)",
  "var(--chart-5)",
  "var(--chart-4)",
]
