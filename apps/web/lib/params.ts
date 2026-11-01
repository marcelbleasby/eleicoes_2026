export const CARGOS = [
  { id: 1, nome: "Presidente" },
  { id: 3, nome: "Governador" },
  { id: 5, nome: "Senador" },
  { id: 6, nome: "Deputado Federal" },
  { id: 7, nome: "Deputado Estadual" },
  { id: 8, nome: "Deputado Distrital" },
] as const

export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const

export const EXTERIOR = "ZZ"
/** Recorte de Presidente só com os votos dados no Brasil (sem o exterior). */
export const BRASIL = "BR"

export const PAGE_SIZE = 20

export type Turno = 1 | 2

export type Ordem2T = "votos" | "margem" | "nome"

export type DashboardParams = {
  turno: Turno
  cargo: number
  uf?: string
  mun?: number
  pais?: string
  q?: string
  page: number
  cand?: string
  vencedor?: string
  ordem: Ordem2T
}

type RawParams = { [key: string]: string | string[] | undefined }

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function ufsDoCargo(cargo: number): string[] {
  if (cargo === 1) return [...UFS, EXTERIOR]
  if (cargo === 7) return UFS.filter((uf) => uf !== "DF")
  if (cargo === 8) return ["DF"]
  return [...UFS]
}

export function nomeUf(uf: string) {
  if (uf === EXTERIOR) return "Exterior"
  if (uf === BRASIL) return "Só Brasil"
  return uf
}

export function parseParams(raw: RawParams): DashboardParams {
  const turno: Turno = first(raw.turno) === "2" ? 2 : 1

  const cargoNum = Number(first(raw.cargo))
  const cargo =
    turno === 2 ? 1 : CARGOS.some((c) => c.id === cargoNum) ? cargoNum : 1

  const ufRaw = first(raw.uf)?.toUpperCase()
  const uf =
    ufRaw &&
    (ufsDoCargo(cargo).includes(ufRaw) || (cargo === 1 && ufRaw === BRASIL))
      ? ufRaw
      : undefined

  const munNum = Number(first(raw.mun))
  const mun =
    uf && uf !== BRASIL && Number.isInteger(munNum) && munNum > 0
      ? munNum
      : undefined

  const pais =
    uf === EXTERIOR
      ? first(raw.pais)?.trim().slice(0, 80) || undefined
      : undefined

  const q = first(raw.q)?.trim().slice(0, 80) || undefined

  const pageNum = Number(first(raw.page))
  const page = Number.isInteger(pageNum) && pageNum > 1 ? pageNum : 1

  const candRaw = first(raw.cand)
  const cand = candRaw && /^\d+$/.test(candRaw) ? candRaw : undefined

  const vencRaw = first(raw.vencedor)
  const vencedor = vencRaw && /^\d+$/.test(vencRaw) ? vencRaw : undefined

  const ordemRaw = first(raw.ordem)
  const ordem: Ordem2T =
    ordemRaw === "margem" || ordemRaw === "nome" ? ordemRaw : "votos"

  return { turno, cargo, uf, mun, pais, q, page, cand, vencedor, ordem }
}

const DEFAULTS: Record<string, string> = {
  turno: "1",
  cargo: "1",
  page: "1",
  ordem: "votos",
}

export function toSearch(
  params: DashboardParams,
  changes: Partial<Record<keyof DashboardParams, string | number | undefined>>
) {
  const merged: Record<string, string | number | undefined> = {
    turno: params.turno,
    cargo: params.cargo,
    uf: params.uf,
    mun: params.mun,
    pais: params.pais,
    q: params.q,
    page: params.page,
    cand: params.cand,
    vencedor: params.vencedor,
    ordem: params.ordem,
    ...changes,
  }
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue
    if (DEFAULTS[key] === String(value)) continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : "?"
}

export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}
