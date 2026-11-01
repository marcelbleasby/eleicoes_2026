import { query } from "@/lib/db"
import {
  BRASIL,
  normalizeSearch,
  PAGE_SIZE,
  type DashboardParams,
  type Ordem2T,
  type Turno,
} from "@/lib/params"

/** Recorte geográfico: Brasil + exterior (vazio), só Brasil, UF, exterior, país ou município. */
type Local = { uf?: string; mun?: number; pais?: string }

type Escopo = Local & { turno: Turno; cargo: number }

/**
 * Condições SQL do recorte para tabelas com sg_uf e cd_municipio.
 * Os valores entram em `args`; o retorno começa com " AND " quando há filtro.
 */
function filtroLocal(local: Local, args: unknown[], alias = "") {
  const col = alias ? `${alias}.` : ""
  const parts: string[] = []
  if (local.uf === BRASIL) {
    parts.push(`${col}sg_uf <> 'ZZ'`)
  } else if (local.uf) {
    args.push(local.uf)
    parts.push(`${col}sg_uf = $${args.length}`)
  }
  if (local.pais) {
    args.push(local.pais)
    parts.push(
      `${col}cd_municipio IN (SELECT cd_municipio FROM dash_exterior WHERE nm_pais = $${args.length})`
    )
  }
  if (local.mun) {
    args.push(local.mun)
    parts.push(`${col}cd_municipio = $${args.length}`)
  }
  return parts.map((part) => ` AND ${part}`).join("")
}

/** FROM/WHERE de votos agregados no recorte. Usa $1 = turno e $2 = cargo. */
function escopoVotos(escopo: Escopo, args: unknown[]) {
  args.push(escopo.turno, escopo.cargo)
  const tabela = escopo.mun || escopo.pais ? "dash_votos_mun" : "dash_votos_uf"
  return `${tabela} WHERE nr_turno = $1 AND cd_cargo = $2${filtroLocal(escopo, args)}`
}

// ---------- Municípios e exterior ----------

export type Municipio = {
  cd_municipio: number
  nm_municipio: string
  nm_pais: string | null
}

/** Municípios da UF. No exterior, só cidades que tiveram votos, opcionalmente de um país. */
export async function getMunicipios(uf: string, pais?: string) {
  return query<Municipio>(
    `SELECT m.cd_municipio, m.nm_municipio, e.nm_pais
     FROM dash_municipio m
     LEFT JOIN dash_exterior e USING (cd_municipio)
     WHERE m.sg_uf = $1
       AND ($2::text IS NULL OR e.nm_pais = $2)
       AND (m.sg_uf <> 'ZZ' OR EXISTS (
         SELECT 1 FROM dash_brancos_nulos b WHERE b.cd_municipio = m.cd_municipio
       ))
     ORDER BY m.nm_municipio`,
    [uf, pais ?? null]
  )
}

export async function getMunicipio(cd: number) {
  const rows = await query<Municipio & { sg_uf: string }>(
    `SELECT m.cd_municipio, m.nm_municipio, m.sg_uf, e.nm_pais
     FROM dash_municipio m
     LEFT JOIN dash_exterior e USING (cd_municipio)
     WHERE m.cd_municipio = $1`,
    [cd]
  )
  return rows[0]
}

export type Pais = { nm_pais: string; nm_regiao: string; cidades: number }

/** Países com votos registrados, agrupáveis por região. */
export async function getPaises() {
  return query<Pais>(
    `SELECT e.nm_pais, e.nm_regiao, COUNT(*)::int AS cidades
     FROM dash_exterior e
     WHERE EXISTS (SELECT 1 FROM dash_brancos_nulos b WHERE b.cd_municipio = e.cd_municipio)
     GROUP BY e.nm_pais, e.nm_regiao
     ORDER BY e.nm_regiao, e.nm_pais`
  )
}

export type VotoExterior = {
  nm_pais: string
  nm_regiao: string
  sq_candidato: string
  nm_urna_candidato: string
  sg_partido: string
  votos: number
}

/** Votos para Presidente por país e candidato no turno. */
export async function getVotosExterior(turno: Turno) {
  return query<VotoExterior>(
    `SELECT e.nm_pais, e.nm_regiao, v.sq_candidato::text, c.nm_urna_candidato, c.sg_partido,
            SUM(v.votos)::float8 AS votos
     FROM dash_votos_mun v
     JOIN dash_exterior e USING (cd_municipio)
     JOIN dash_candidato c ON c.nr_turno = v.nr_turno AND c.sq_candidato = v.sq_candidato
     WHERE v.nr_turno = $1 AND v.cd_cargo = 1 AND v.sg_uf = 'ZZ'
     GROUP BY e.nm_pais, e.nm_regiao, v.sq_candidato, c.nm_urna_candidato, c.sg_partido`,
    [turno]
  )
}

// ---------- Ranking e resumo ----------

export type CandidatoRanking = {
  sq_candidato: string
  nr_candidato: number
  nm_urna_candidato: string
  nm_candidato: string
  sg_partido: string
  sg_ue: string
  situacao: string
  votos: number
  posicao: number
  pct: number
  total: number
}

export async function getRanking(
  p: DashboardParams,
  opts: { limit?: number; ignoreSearch?: boolean } = {}
) {
  const args: unknown[] = []
  const from = escopoVotos(p, args)
  const q = opts.ignoreSearch || !p.q ? null : normalizeSearch(p.q)
  args.push(q)
  const qIdx = args.length
  const limit = opts.limit ?? PAGE_SIZE
  args.push(limit, opts.limit ? 0 : (p.page - 1) * PAGE_SIZE)

  return query<CandidatoRanking>(
    `WITH escopo AS (
       SELECT sq_candidato, SUM(votos) AS votos FROM ${from} GROUP BY sq_candidato
     ),
     calc AS (
       SELECT c.sq_candidato::text, c.nr_candidato, c.nm_urna_candidato, c.nm_candidato,
              c.sg_partido, c.sg_ue, c.ds_sit_tot_turno AS situacao, c.busca,
              e.votos::float8 AS votos,
              RANK() OVER (PARTITION BY c.sg_ue ORDER BY e.votos DESC)::int AS posicao,
              (100.0 * e.votos / NULLIF(SUM(e.votos) OVER (PARTITION BY c.sg_ue), 0))::float8 AS pct
       FROM escopo e
       JOIN dash_candidato c ON c.nr_turno = $1 AND c.sq_candidato = e.sq_candidato
     )
     SELECT *, COUNT(*) OVER ()::int AS total
     FROM calc
     WHERE $${qIdx}::text IS NULL OR busca LIKE '%' || $${qIdx} || '%'
     ORDER BY votos DESC, nm_urna_candidato
     LIMIT $${qIdx + 1} OFFSET $${qIdx + 2}`,
    args
  )
}

export type Resumo = {
  validos: number
  candidatos: number
  eleitos: number
  brancos: number | null
  nulos: number | null
  municipios: number
  /** Votos válidos dados no exterior, quando o recorte inclui Brasil + exterior. */
  exterior: number | null
}

export async function getResumo(p: Escopo): Promise<Resumo> {
  const args: unknown[] = []
  const from = escopoVotos(p, args)
  const [votos] = await query<{
    validos: number
    candidatos: number
    eleitos: number
  }>(
    `WITH escopo AS (
       SELECT sq_candidato, SUM(votos) AS votos FROM ${from} GROUP BY sq_candidato
     )
     SELECT COALESCE(SUM(e.votos), 0)::float8 AS validos,
            COUNT(*)::int AS candidatos,
            COUNT(*) FILTER (WHERE c.ds_sit_tot_turno LIKE 'ELEITO%')::int AS eleitos
     FROM escopo e
     JOIN dash_candidato c ON c.nr_turno = $1 AND c.sq_candidato = e.sq_candidato`,
    args
  )

  let brancos: number | null = null
  let nulos: number | null = null
  let exterior: number | null = null
  let municipios: number

  if (p.cargo === 1) {
    const bnArgs: unknown[] = [p.turno]
    const [bn] = await query<{
      brancos: number
      nulos: number
      municipios: number
    }>(
      `SELECT COALESCE(SUM(brancos), 0)::float8 AS brancos,
              COALESCE(SUM(nulos), 0)::float8 AS nulos,
              COUNT(*)::int AS municipios
       FROM dash_brancos_nulos
       WHERE nr_turno = $1${filtroLocal(p, bnArgs)}`,
      bnArgs
    )
    brancos = bn?.brancos ?? 0
    nulos = bn?.nulos ?? 0
    municipios = bn?.municipios ?? 0

    if (!p.uf) {
      const [ext] = await query<{ votos: number }>(
        `SELECT COALESCE(SUM(votos), 0)::float8 AS votos FROM dash_votos_uf
         WHERE nr_turno = $1 AND cd_cargo = 1 AND sg_uf = 'ZZ'`,
        [p.turno]
      )
      exterior = ext?.votos ?? 0
    }
  } else {
    const mArgs: unknown[] = []
    const [m] = await query<{ municipios: number }>(
      `SELECT COUNT(*)::int AS municipios FROM dash_municipio
       WHERE sg_uf <> 'ZZ'${filtroLocal(p, mArgs)}`,
      mArgs
    )
    municipios = m?.municipios ?? 0
  }

  return {
    validos: votos?.validos ?? 0,
    candidatos: votos?.candidatos ?? 0,
    eleitos: votos?.eleitos ?? 0,
    brancos,
    nulos,
    municipios,
    exterior,
  }
}

export type VotosPartido = { sg_partido: string; votos: number }

/** Votos válidos por partido no recorte. */
export async function getVotosPorPartido(p: Escopo) {
  const args: unknown[] = []
  const from = escopoVotos(p, args)
  return query<VotosPartido>(
    `WITH escopo AS (
       SELECT sq_candidato, SUM(votos) AS votos FROM ${from} GROUP BY sq_candidato
     )
     SELECT c.sg_partido, SUM(e.votos)::float8 AS votos
     FROM escopo e
     JOIN dash_candidato c ON c.nr_turno = $1 AND c.sq_candidato = e.sq_candidato
     GROUP BY c.sg_partido
     ORDER BY votos DESC`,
    args
  )
}

export type EleitosPartido = { sg_partido: string; eleitos: number }

/** Eleitos no 1º turno por partido, no cargo e (opcionalmente) na UF. */
export async function getEleitosPorPartido(cargo: number, uf?: string) {
  return query<EleitosPartido>(
    `SELECT sg_partido, COUNT(*)::int AS eleitos
     FROM dash_candidato
     WHERE nr_turno = 1 AND cd_cargo = $1 AND ds_sit_tot_turno LIKE 'ELEITO%'
       AND ($2::text IS NULL OR sg_ue = $2)
     GROUP BY sg_partido
     ORDER BY eleitos DESC, sg_partido`,
    [cargo, uf ?? null]
  )
}

// ---------- Candidato ----------

export type CandidatoDetalhe = {
  sq_candidato: string
  nr_candidato: number
  nm_urna_candidato: string
  nm_candidato: string
  sg_partido: string
  sg_ue: string
  ds_cargo: string
  cd_cargo: number
  situacao: string
  votos_total: number
}

export type VotoLocal = {
  local: string
  sg_uf: string
  nm_pais: string | null
  votos: number
  pct: number
}

export async function getCandidato(turno: Turno, sq: string) {
  const [cand] = await query<CandidatoDetalhe>(
    `SELECT sq_candidato::text, nr_candidato, nm_urna_candidato, nm_candidato,
            sg_partido, sg_ue, ds_cargo, cd_cargo, ds_sit_tot_turno AS situacao,
            votos::float8 AS votos_total
     FROM dash_candidato
     WHERE nr_turno = $1 AND sq_candidato = $2`,
    [turno, sq]
  )
  return cand
}

/** Municípios com mais votos do candidato, com o percentual sobre os válidos do cargo no município. */
export async function getTopMunicipiosCandidato(
  turno: Turno,
  cargo: number,
  sq: string,
  local: Local
) {
  const args: unknown[] = [sq, turno, cargo]
  return query<VotoLocal>(
    `SELECT m.nm_municipio AS local, m.sg_uf, e.nm_pais, v.votos::float8 AS votos,
            (100.0 * v.votos / NULLIF(t.total, 0))::float8 AS pct
     FROM dash_votos_mun v
     JOIN dash_municipio m USING (cd_municipio)
     LEFT JOIN dash_exterior e USING (cd_municipio)
     CROSS JOIN LATERAL (
       SELECT SUM(x.votos) AS total FROM dash_votos_mun x
       WHERE x.nr_turno = v.nr_turno AND x.cd_cargo = v.cd_cargo AND x.cd_municipio = v.cd_municipio
     ) t
     WHERE v.sq_candidato = $1 AND v.nr_turno = $2 AND v.cd_cargo = $3${filtroLocal(local, args, "v")}
     ORDER BY v.votos DESC
     LIMIT 8`,
    args
  )
}

/** Votos do candidato por UF (útil para Presidente). */
export async function getVotosPorUfCandidato(turno: Turno, sq: string) {
  return query<VotoLocal>(
    `SELECT v.sg_uf AS local, v.sg_uf, NULL AS nm_pais, v.votos::float8 AS votos,
            (100.0 * v.votos / NULLIF(SUM(t.votos), 0))::float8 AS pct
     FROM dash_votos_uf v
     JOIN dash_votos_uf t ON t.nr_turno = v.nr_turno AND t.cd_cargo = v.cd_cargo AND t.sg_uf = v.sg_uf
     WHERE v.sq_candidato = $1 AND v.nr_turno = $2
     GROUP BY v.sg_uf, v.votos
     ORDER BY pct DESC`,
    [sq, turno]
  )
}

export type CandidatoSugestao = {
  sq_candidato: string
  nr_candidato: number
  nm_urna_candidato: string
  nm_candidato: string
  sg_partido: string
  sg_ue: string
  cd_cargo: number
  ds_cargo: string
  situacao: string
  votos: number
  total: number
}

/**
 * Pesquisa de candidatos por nome de urna, nome completo, partido ou número.
 * Ordem: cargo informado, termo como palavra inteira, termo no começo de uma
 * palavra e, por fim, os mais votados.
 */
export async function searchCandidatos(
  turno: Turno,
  termo: string,
  opts: { cargo?: number; limit: number }
) {
  const regex = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return query<CandidatoSugestao>(
    `SELECT sq_candidato::text, nr_candidato, nm_urna_candidato, nm_candidato, sg_partido,
            sg_ue, cd_cargo, ds_cargo, ds_sit_tot_turno AS situacao, votos::float8 AS votos,
            COUNT(*) OVER ()::int AS total
     FROM dash_candidato
     WHERE nr_turno = $1 AND busca LIKE '%' || $2 || '%'
     ORDER BY (cd_cargo = $3) DESC NULLS LAST,
              (busca ~ ('\\m' || $5 || '\\M')) DESC,
              (busca ~ ('\\m' || $5)) DESC,
              votos DESC
     LIMIT $4`,
    [turno, termo, opts.cargo ?? null, opts.limit, regex]
  )
}

// ---------- 2º turno (Presidente) ----------

export async function getFinalistas() {
  return query<{ sq_candidato: string; nm_urna_candidato: string }>(
    `SELECT c.sq_candidato::text, c.nm_urna_candidato
     FROM dash_candidato c
     WHERE c.nr_turno = 2
     ORDER BY c.ds_sit_tot_turno = 'ELEITO' DESC, c.nm_urna_candidato`
  )
}

export type Finalista = {
  sq_candidato: string
  nr_candidato: number
  nm_urna_candidato: string
  sg_partido: string
  situacao: string
  votos_1t: number
  votos_2t: number
  pct_1t: number
  pct_2t: number
  municipios_vencidos: number
}

export type Resumo2T = {
  finalistas: Finalista[]
  validos_1t: number
  validos_2t: number
  brancos_1t: number
  brancos_2t: number
  nulos_1t: number
  nulos_2t: number
  municipios: number
}

export async function getResumo2T(local: Local): Promise<Resumo2T> {
  const args: unknown[] = []
  const filtro = filtroLocal(local, args)

  const finalistas = await query<Finalista>(
    `WITH f AS (
       SELECT sq_candidato, nr_candidato, nm_urna_candidato, sg_partido, ds_sit_tot_turno AS situacao
       FROM dash_candidato WHERE nr_turno = 2
     ),
     v AS (
       SELECT nr_turno, cd_municipio, sq_candidato, votos
       FROM dash_votos_mun
       WHERE cd_cargo = 1${filtro}
     ),
     tot AS (
       SELECT nr_turno, SUM(votos) AS validos FROM v GROUP BY nr_turno
     ),
     cand AS (
       SELECT sq_candidato,
              SUM(votos) FILTER (WHERE nr_turno = 1) AS votos_1t,
              SUM(votos) FILTER (WHERE nr_turno = 2) AS votos_2t
       FROM v WHERE sq_candidato IN (SELECT sq_candidato FROM f)
       GROUP BY sq_candidato
     ),
     vencedores AS (
       SELECT DISTINCT ON (cd_municipio) cd_municipio, sq_candidato
       FROM v WHERE nr_turno = 2
       ORDER BY cd_municipio, votos DESC
     )
     SELECT f.sq_candidato::text, f.nr_candidato, f.nm_urna_candidato, f.sg_partido, f.situacao,
            COALESCE(c.votos_1t, 0)::float8 AS votos_1t,
            COALESCE(c.votos_2t, 0)::float8 AS votos_2t,
            (100.0 * c.votos_1t / NULLIF((SELECT validos FROM tot WHERE nr_turno = 1), 0))::float8 AS pct_1t,
            (100.0 * c.votos_2t / NULLIF((SELECT validos FROM tot WHERE nr_turno = 2), 0))::float8 AS pct_2t,
            (SELECT COUNT(*) FROM vencedores w WHERE w.sq_candidato = f.sq_candidato)::int AS municipios_vencidos
     FROM f LEFT JOIN cand c USING (sq_candidato)
     ORDER BY f.situacao = 'ELEITO' DESC, f.nm_urna_candidato`,
    args
  )

  const [bn] = await query<{
    validos_1t: number
    validos_2t: number
    brancos_1t: number
    brancos_2t: number
    nulos_1t: number
    nulos_2t: number
    municipios: number
  }>(
    `SELECT
       (SELECT COALESCE(SUM(votos), 0) FROM dash_votos_mun
         WHERE cd_cargo = 1 AND nr_turno = 1${filtro})::float8 AS validos_1t,
       (SELECT COALESCE(SUM(votos), 0) FROM dash_votos_mun
         WHERE cd_cargo = 1 AND nr_turno = 2${filtro})::float8 AS validos_2t,
       COALESCE(SUM(brancos) FILTER (WHERE nr_turno = 1), 0)::float8 AS brancos_1t,
       COALESCE(SUM(brancos) FILTER (WHERE nr_turno = 2), 0)::float8 AS brancos_2t,
       COALESCE(SUM(nulos) FILTER (WHERE nr_turno = 1), 0)::float8 AS nulos_1t,
       COALESCE(SUM(nulos) FILTER (WHERE nr_turno = 2), 0)::float8 AS nulos_2t,
       COUNT(*) FILTER (WHERE nr_turno = 2)::int AS municipios
     FROM dash_brancos_nulos
     WHERE true${filtro}`,
    args
  )

  return {
    finalistas,
    validos_1t: bn?.validos_1t ?? 0,
    validos_2t: bn?.validos_2t ?? 0,
    brancos_1t: bn?.brancos_1t ?? 0,
    brancos_2t: bn?.brancos_2t ?? 0,
    nulos_1t: bn?.nulos_1t ?? 0,
    nulos_2t: bn?.nulos_2t ?? 0,
    municipios: bn?.municipios ?? 0,
  }
}

export type ResultadoUf = {
  sg_uf: string
  votos_a: number
  votos_b: number
  pct_a: number
  pct_b: number
}

export async function getResultadoPorUf2T(a: string, b: string) {
  return query<ResultadoUf>(
    `SELECT sg_uf,
            SUM(votos) FILTER (WHERE sq_candidato = $1)::float8 AS votos_a,
            SUM(votos) FILTER (WHERE sq_candidato = $2)::float8 AS votos_b,
            (100.0 * SUM(votos) FILTER (WHERE sq_candidato = $1) / NULLIF(SUM(votos), 0))::float8 AS pct_a,
            (100.0 * SUM(votos) FILTER (WHERE sq_candidato = $2) / NULLIF(SUM(votos), 0))::float8 AS pct_b
     FROM dash_votos_uf
     WHERE nr_turno = 2 AND cd_cargo = 1
     GROUP BY sg_uf
     ORDER BY pct_a DESC`,
    [a, b]
  )
}

export type Municipio2T = {
  cd_municipio: number
  nm_municipio: string
  sg_uf: string
  nm_pais: string | null
  votos_a: number
  votos_b: number
  pct_a: number
  pct_b: number
  pct_a_1t: number | null
  pct_b_1t: number | null
  vencedor: string | null
  margem: number
  total: number
}

const ORDEM_SQL: Record<Ordem2T, string> = {
  votos: "(votos_a + votos_b) DESC",
  margem: "margem ASC",
  nome: "nm_municipio ASC",
}

export async function getMunicipios2T(
  p: DashboardParams,
  a: string,
  b: string
) {
  const args: unknown[] = [a, b]
  const filtro = filtroLocal(p, args)
  args.push(p.q ? normalizeSearch(p.q) : null)
  const qIdx = args.length
  args.push(p.vencedor ?? null, PAGE_SIZE, (p.page - 1) * PAGE_SIZE)

  return query<Municipio2T>(
    `WITH v AS (
       SELECT cd_municipio, nr_turno, sq_candidato, votos
       FROM dash_votos_mun
       WHERE cd_cargo = 1${filtro}
     ),
     piv AS (
       SELECT cd_municipio,
              COALESCE(SUM(votos) FILTER (WHERE nr_turno = 2 AND sq_candidato = $1), 0) AS votos_a,
              COALESCE(SUM(votos) FILTER (WHERE nr_turno = 2 AND sq_candidato = $2), 0) AS votos_b,
              SUM(votos) FILTER (WHERE nr_turno = 1 AND sq_candidato = $1) AS a_1t,
              SUM(votos) FILTER (WHERE nr_turno = 1 AND sq_candidato = $2) AS b_1t,
              SUM(votos) FILTER (WHERE nr_turno = 1) AS validos_1t
       FROM v
       GROUP BY cd_municipio
       HAVING SUM(votos) FILTER (WHERE nr_turno = 2) > 0
     ),
     calc AS (
       SELECT p.cd_municipio, m.nm_municipio, m.sg_uf, e.nm_pais, m.busca,
              p.votos_a::float8, p.votos_b::float8,
              (100.0 * p.votos_a / NULLIF(p.votos_a + p.votos_b, 0))::float8 AS pct_a,
              (100.0 * p.votos_b / NULLIF(p.votos_a + p.votos_b, 0))::float8 AS pct_b,
              (100.0 * p.a_1t / NULLIF(p.validos_1t, 0))::float8 AS pct_a_1t,
              (100.0 * p.b_1t / NULLIF(p.validos_1t, 0))::float8 AS pct_b_1t,
              CASE WHEN p.votos_a > p.votos_b THEN $1::text
                   WHEN p.votos_b > p.votos_a THEN $2::text END AS vencedor,
              (100.0 * ABS(p.votos_a - p.votos_b) / NULLIF(p.votos_a + p.votos_b, 0))::float8 AS margem
       FROM piv p
       JOIN dash_municipio m USING (cd_municipio)
       LEFT JOIN dash_exterior e USING (cd_municipio)
     )
     SELECT *, COUNT(*) OVER ()::int AS total
     FROM calc
     WHERE ($${qIdx}::text IS NULL OR busca LIKE '%' || $${qIdx} || '%'
            OR lower(unaccent(nm_pais)) LIKE '%' || $${qIdx} || '%')
       AND ($${qIdx + 1}::text IS NULL OR vencedor = $${qIdx + 1})
     ORDER BY ${ORDEM_SQL[p.ordem]}, nm_municipio
     LIMIT $${qIdx + 2} OFFSET $${qIdx + 3}`,
    args
  )
}

export type BrasilExterior = {
  regiao: "Brasil" | "Exterior"
  sq_candidato: string
  votos: number
}

/** Votos do 2º turno de cada finalista, separados entre Brasil e exterior. */
export async function getBrasilExterior2T() {
  return query<BrasilExterior>(
    `SELECT CASE WHEN sg_uf = 'ZZ' THEN 'Exterior' ELSE 'Brasil' END AS regiao,
            sq_candidato::text, SUM(votos)::float8 AS votos
     FROM dash_votos_uf
     WHERE nr_turno = 2 AND cd_cargo = 1
     GROUP BY 1, 2`
  )
}
