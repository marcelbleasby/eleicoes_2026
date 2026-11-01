import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import {
  DonutChart,
  StackedShareChart,
  type Finalist,
} from "@/components/dashboard/charts"
import { NavLink } from "@/components/dashboard/navigation"
import { Section } from "@/components/dashboard/ui"
import {
  fmtCompact,
  fmtInt,
  fmtPct,
  partyColor,
  SERIES_COLORS,
} from "@/lib/format"
import { toSearch, type DashboardParams } from "@/lib/params"
import { getVotosExterior, type VotoExterior } from "@/lib/queries"

type Candidato = { sq: string; nome: string; partido: string; votos: number }

type PaisResumo = {
  pais: string
  regiao: string
  validos: number
  candidatos: Candidato[]
}

function agruparPorPais(rows: VotoExterior[]): PaisResumo[] {
  const paises = new Map<string, PaisResumo>()
  for (const row of rows) {
    const pais =
      paises.get(row.nm_pais) ??
      ({
        pais: row.nm_pais,
        regiao: row.nm_regiao,
        validos: 0,
        candidatos: [],
      } as PaisResumo)
    pais.validos += row.votos
    pais.candidatos.push({
      sq: row.sq_candidato,
      nome: row.nm_urna_candidato,
      partido: row.sg_partido,
      votos: row.votos,
    })
    paises.set(row.nm_pais, pais)
  }
  for (const pais of paises.values()) {
    pais.candidatos.sort((x, y) => y.votos - x.votos)
  }
  return [...paises.values()].sort((x, y) => y.validos - x.validos)
}

function RegioesDonut({ paises }: { paises: PaisResumo[] }) {
  const porRegiao = new Map<string, { votos: number; paises: number }>()
  for (const p of paises) {
    const atual = porRegiao.get(p.regiao) ?? { votos: 0, paises: 0 }
    porRegiao.set(p.regiao, {
      votos: atual.votos + p.validos,
      paises: atual.paises + 1,
    })
  }
  const regioes = [...porRegiao].sort((x, y) => y[1].votos - x[1].votos)
  const total = regioes.reduce((acc, [, r]) => acc + r.votos, 0)
  const [maior] = regioes

  return (
    <DonutChart
      summary={`Votos válidos no exterior por região. ${maior?.[0]} concentra ${fmtPct(
        (100 * (maior?.[1].votos ?? 0)) / (total || 1)
      )}.`}
      centerValue={fmtCompact(total)}
      centerLabel="válidos"
      data={regioes.map(([regiao, r], i) => ({
        key: `regiao-${i}`,
        label: regiao,
        hint: `${regiao}: ${r.paises} países`,
        value: r.votos,
        fill: SERIES_COLORS[i % SERIES_COLORS.length]!,
      }))}
    />
  )
}

function PaisLink({ params, pais }: { params: DashboardParams; pais: string }) {
  return (
    <NavLink
      href={toSearch(params, {
        pais,
        mun: undefined,
        page: undefined,
        q: undefined,
      })}
      className="-mx-1 inline-flex min-h-9 cursor-pointer items-center rounded px-1 font-medium underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {pais}
    </NavLink>
  )
}

/** Exterior no 1º turno: regiões e o resultado de cada país. */
export async function Exterior1T({ params }: { params: DashboardParams }) {
  const paises = agruparPorPais(await getVotosExterior(1))
  const top = paises[0]

  return (
    <div className="grid gap-4">
      <Section
        title="Exterior por região"
        description={`${paises.length} países com votos · maior colégio: ${top?.pais ?? "–"}`}
      >
        <RegioesDonut paises={paises} />
      </Section>
      <Section
        title="Resultado por país"
        description="Dois mais votados em cada país. Selecione um país para filtrar."
      >
        <div className="max-h-96 overflow-y-auto">
          <Table className="text-sm">
            <caption className="sr-only">
              Votos válidos para Presidente por país no 1º turno, com os dois
              mais votados.
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>País</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Válidos
                </TableHead>
                <TableHead>1º colocado</TableHead>
                <TableHead className="hidden xl:table-cell">
                  2º colocado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paises.map((p) => (
                <TableRow key={p.pais}>
                  <TableCell>
                    <PaisLink params={params} pais={p.pais} />
                    <span className="block text-xs text-muted-foreground">
                      {p.regiao}
                      <span className="sm:hidden">
                        {" · "}
                        {fmtInt(p.validos)} válidos
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                    {fmtInt(p.validos)}
                  </TableCell>
                  {[0, 1].map((i) => {
                    const c = p.candidatos[i]
                    return (
                      <TableCell
                        key={i}
                        className={cn(
                          "whitespace-normal sm:whitespace-nowrap",
                          i === 1 && "hidden xl:table-cell"
                        )}
                      >
                        {c ? (
                          <span className="inline-flex flex-wrap items-center gap-x-1.5 sm:flex-nowrap sm:whitespace-nowrap">
                            <span
                              aria-hidden
                              className="size-2.5 rounded-full"
                              style={{ background: partyColor(c.partido) }}
                            />
                            {c.nome}
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {fmtPct((100 * c.votos) / (p.validos || 1))}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  )
}

/** Exterior no 2º turno: regiões, divisão por país e tabela de países. */
export async function Exterior2T({
  params,
  finalistas,
  a,
  b,
}: {
  params: DashboardParams
  finalistas: Finalist[]
  a: string
  b: string
}) {
  const paises = agruparPorPais(await getVotosExterior(2)).map((p) => {
    const votosA = p.candidatos.find((c) => c.sq === a)?.votos ?? 0
    const votosB = p.candidatos.find((c) => c.sq === b)?.votos ?? 0
    const soma = votosA + votosB || 1
    return {
      ...p,
      votosA,
      votosB,
      pctA: (100 * votosA) / soma,
      pctB: (100 * votosB) / soma,
    }
  })
  const [fa, fb] = finalistas
  const top = paises.slice(0, 20)
  const venceA = paises.filter((p) => p.votosA > p.votosB).length

  return (
    <>
      <Section
        title="Resultado por país"
        description={`Os 20 países com mais votos válidos. ${fa?.nome} vence em ${venceA} de ${paises.length} países.`}
      >
        <StackedShareChart
          finalistas={finalistas}
          summary={`${fa?.nome} vence em ${venceA} de ${paises.length} países no 2º turno.`}
          height={320}
          minBarWidth={36}
          angledLabels
          data={top.map((p) => ({
            label: p.pais.length > 14 ? `${p.pais.slice(0, 13)}…` : p.pais,
            a: p.pctA,
            b: p.pctB,
            votos_a: p.votosA,
            votos_b: p.votosB,
          }))}
        />
      </Section>

      <div className="grid gap-4 xl:grid-cols-5">
        <Section
          className="xl:col-span-2"
          title="Exterior por região"
          description="Votos válidos do 2º turno"
        >
          <RegioesDonut paises={paises} />
        </Section>
        <Section
          className="xl:col-span-3"
          title="Todos os países"
          description="Selecione um país para ver as cidades."
        >
          <div className="max-h-96 overflow-y-auto">
            <Table className="text-sm">
              <caption className="sr-only">
                Votos de cada finalista por país no 2º turno.
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead className="text-right">
                    <span className="md:hidden">{fa?.nome.split(" ")[0]}</span>
                    <span className="hidden md:inline">{fa?.nome}</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="md:hidden">{fb?.nome.split(" ")[0]}</span>
                    <span className="hidden md:inline">{fb?.nome}</span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Vencedor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paises.map((p) => {
                  const vencedor =
                    p.votosA > p.votosB
                      ? fa
                      : p.votosB > p.votosA
                        ? fb
                        : undefined
                  return (
                    <TableRow key={p.pais}>
                      <TableCell>
                        <PaisLink params={params} pais={p.pais} />
                        <span className="block text-xs text-muted-foreground">
                          {p.regiao}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <div
                          className={
                            vencedor === fa ? "font-semibold" : undefined
                          }
                        >
                          {fmtPct(p.pctA)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtInt(p.votosA)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <div
                          className={
                            vencedor === fb ? "font-semibold" : undefined
                          }
                        >
                          {fmtPct(p.pctB)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtInt(p.votosB)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {vencedor ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span
                              aria-hidden
                              className="size-2.5 rounded-full"
                              style={{ background: vencedor.cor }}
                            />
                            {vencedor.nome}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Empate</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>
    </>
  )
}
