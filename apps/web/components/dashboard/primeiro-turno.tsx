import {
  ArrowRightIcon,
  Building2Icon,
  FileXIcon,
  CrownIcon,
  UserCheckIcon,
  VoteIcon,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { DonutChart, RankingChart } from "@/components/dashboard/charts"
import { Exterior1T } from "@/components/dashboard/exterior"
import { NavLink } from "@/components/dashboard/navigation"
import {
  EmptyState,
  KpiCard,
  Pager,
  PctBar,
  Section,
  SituacaoBadge,
} from "@/components/dashboard/ui"
import {
  distinctPartyColors,
  fmtCompact,
  fmtInt,
  fmtPct,
  OUTROS_COLOR,
  partyColor,
} from "@/lib/format"
import {
  CARGOS,
  EXTERIOR,
  nomeUf,
  toSearch,
  type DashboardParams,
} from "@/lib/params"
import {
  getCandidato,
  getEleitosPorPartido,
  getRanking,
  getResumo,
  getTopMunicipiosCandidato,
  getVotosPorPartido,
  getVotosPorUfCandidato,
  type CandidatoRanking,
  type EleitosPartido,
  type Resumo,
  type VotosPartido,
} from "@/lib/queries"

export async function PrimeiroTurno({
  params,
  escopo,
}: {
  params: DashboardParams
  escopo: string
}) {
  const presidente = params.cargo === 1
  const [resumo, ranking, top, partidos, eleitos] = await Promise.all([
    getResumo(params),
    getRanking(params),
    getRanking(params, { limit: 10, ignoreSearch: true }),
    getVotosPorPartido(params),
    presidente
      ? Promise.resolve([])
      : getEleitosPorPartido(params.cargo, params.uf),
  ])

  const cargo = CARGOS.find((c) => c.id === params.cargo)?.nome ?? ""
  const exterior = params.uf === EXTERIOR
  const lider = top[0]
  const selecionado = params.cand ?? lider?.sq_candidato
  const total = ranking[0]?.total ?? 0
  const mostraUe = !presidente && !params.uf
  const brancosNulos = (resumo.brancos ?? 0) + (resumo.nulos ?? 0)
  const comparecimento = resumo.validos + brancosNulos

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={VoteIcon}
          label="Votos válidos"
          value={fmtInt(resumo.validos)}
          hint={
            resumo.exterior
              ? `inclui ${fmtCompact(resumo.exterior)} no exterior`
              : `${fmtInt(resumo.candidatos)} candidatos com votos`
          }
        />
        <KpiCard
          icon={CrownIcon}
          label={mostraUe ? "Mais votado" : "Liderança"}
          valueClassName="font-sans text-base leading-7 sm:text-xl sm:leading-8"
          value={lider?.nm_urna_candidato ?? "–"}
          hint={
            lider &&
            `${lider.sg_partido}${mostraUe ? ` · ${lider.sg_ue}` : ""} · ${fmtPct(lider.pct)}`
          }
        />
        {presidente ? (
          <KpiCard
            icon={FileXIcon}
            label="Brancos e nulos"
            value={fmtInt(brancosNulos)}
            hint={`${fmtPct((100 * brancosNulos) / (comparecimento || 1))} dos votos · ${fmtCompact(resumo.brancos)} brancos`}
          />
        ) : (
          <KpiCard
            icon={UserCheckIcon}
            label="Eleitos no 1º turno"
            value={fmtInt(resumo.eleitos)}
            hint={
              params.cargo === 3
                ? "Governadores; o restante foi ao 2º turno"
                : "Inclui eleitos por QP e por média"
            }
          />
        )}
        <KpiCard
          icon={Building2Icon}
          label={exterior ? "Cidades no exterior" : "Municípios"}
          value={fmtInt(resumo.municipios)}
          hint={escopo}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Section
            title={`10 mais votados · ${cargo}`}
            description={`${escopo} · % dos votos válidos${mostraUe ? " na UF do candidato" : ""}`}
          >
            {top.length ? (
              <RankingChart
                summary={`Os mais votados para ${cargo} em ${escopo}: ${top
                  .slice(0, 5)
                  .map((c) => `${c.nm_urna_candidato} ${fmtPct(c.pct)}`)
                  .join(", ")}.`}
                data={top.map((c) => ({
                  nome: mostraUe
                    ? `${c.nm_urna_candidato} (${c.sg_ue})`
                    : c.nm_urna_candidato,
                  votos: c.votos,
                  pct: c.pct,
                  fill: partyColor(c.sg_partido),
                }))}
              />
            ) : (
              <EmptyState title="Sem votos neste recorte" />
            )}
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Section
              title="Votos por partido"
              description={`${cargo} · ${escopo}`}
            >
              <PartidosDonut partidos={partidos} validos={resumo.validos} />
            </Section>
            {presidente ? (
              <Section
                title="Composição dos votos"
                description={`Válidos, brancos e nulos · ${escopo}`}
              >
                <ComposicaoDonut resumo={resumo} />
              </Section>
            ) : (
              <Section
                title="Eleitos por partido"
                description={`${cargo} · ${params.uf ? nomeUf(params.uf) : "Brasil"}${
                  params.mun ? " (a eleição é por UF)" : ""
                }`}
              >
                <EleitosDonut eleitos={eleitos} cargo={params.cargo} />
              </Section>
            )}
          </div>

          {presidente && exterior && !params.pais && !params.mun && (
            <Exterior1T params={params} />
          )}

          <Section
            id="ranking"
            title="Ranking de candidatos"
            description={
              params.q
                ? `${fmtInt(total)} resultado(s) para “${params.q}”`
                : `${fmtInt(total)} candidatos · ${escopo}`
            }
          >
            <RankingTable
              params={params}
              rows={ranking}
              selecionado={selecionado}
              mostraUe={mostraUe}
            />
            <Pager params={params} total={total} />
          </Section>
        </div>

        <aside
          aria-label="Detalhes do candidato"
          className="min-w-0 lg:sticky lg:top-4 lg:self-start"
        >
          {selecionado ? (
            <CandidatoPanel params={params} sq={selecionado} />
          ) : (
            <Section title="Candidato">
              <EmptyState title="Nenhum candidato neste recorte" />
            </Section>
          )}
        </aside>
      </div>
    </div>
  )
}

function RankingTable({
  params,
  rows,
  selecionado,
  mostraUe,
}: {
  params: DashboardParams
  rows: CandidatoRanking[]
  selecionado?: string
  mostraUe: boolean
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={`Nenhum candidato encontrado para “${params.q ?? ""}”`}
      >
        Confira a grafia, tente só o sobrenome, o número de urna (ex.: 13) ou a
        sigla do partido. Você também pode trocar o cargo ou a UF nos filtros.
      </EmptyState>
    )
  }

  return (
    <Table className="text-sm">
      <caption className="sr-only">
        Candidatos ordenados por votos. Selecione um nome para ver os detalhes.
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 pl-0 text-right sm:w-12">Pos.</TableHead>
          <TableHead>Candidato</TableHead>
          <TableHead className="hidden xl:table-cell">Partido</TableHead>
          {mostraUe && (
            <TableHead className="hidden xl:table-cell">UF</TableHead>
          )}
          <TableHead className="pr-0 text-right md:pr-2">Votos</TableHead>
          <TableHead className="hidden md:table-cell xl:w-40">
            % válidos
          </TableHead>
          <TableHead className="hidden xl:table-cell">Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const ativo = row.sq_candidato === selecionado
          return (
            <TableRow
              key={row.sq_candidato}
              data-state={ativo ? "selected" : undefined}
              className={cn(ativo && "bg-primary/5")}
            >
              <TableCell className="pl-0 text-right font-mono text-muted-foreground tabular-nums">
                {row.posicao}º
              </TableCell>
              <TableCell>
                <NavLink
                  href={toSearch(params, { cand: row.sq_candidato })}
                  aria-current={ativo ? "true" : undefined}
                  data-scroll-to="detalhe"
                  className="-mx-1 flex min-h-11 max-w-[50vw] min-w-0 cursor-pointer flex-col justify-center rounded px-1 font-medium underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-64 md:min-h-9 md:max-w-80"
                  title={row.nm_candidato}
                >
                  <span className="block truncate">
                    {row.nm_urna_candidato}
                  </span>
                  <span className="hidden truncate text-xs font-normal text-muted-foreground xl:block">
                    {row.nr_candidato} · {row.nm_candidato}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-normal text-muted-foreground xl:hidden">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: partyColor(row.sg_partido) }}
                    />
                    <span className="truncate">
                      {row.sg_partido}
                      {mostraUe && ` · ${row.sg_ue}`}
                      {" · "}
                      {row.situacao.charAt(0) +
                        row.situacao.slice(1).toLowerCase()}
                    </span>
                  </span>
                </NavLink>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: partyColor(row.sg_partido) }}
                  />
                  {row.sg_partido}
                </span>
              </TableCell>
              {mostraUe && (
                <TableCell className="hidden xl:table-cell">
                  {row.sg_ue}
                </TableCell>
              )}
              <TableCell className="pr-0 text-right font-mono tabular-nums md:pr-2">
                {fmtInt(row.votos)}
                <span className="block text-xs text-muted-foreground md:hidden">
                  {fmtPct(row.pct)}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <span className="w-14 text-right font-mono tabular-nums">
                    {fmtPct(row.pct)}
                  </span>
                  <div className="hidden w-full xl:block">
                    <PctBar
                      value={row.pct}
                      color={partyColor(row.sg_partido)}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <SituacaoBadge situacao={row.situacao} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

async function CandidatoPanel({
  params,
  sq,
}: {
  params: DashboardParams
  sq: string
}) {
  const cand = await getCandidato(params.turno, sq)
  if (!cand) {
    return (
      <Section title="Candidato" id="detalhe">
        <EmptyState title="Candidato não encontrado">
          Ele pode não ter votos neste turno. Escolha outro nome no ranking.
        </EmptyState>
      </Section>
    )
  }

  const presidente = cand.cd_cargo === 1
  const [municipios, porUf] = await Promise.all([
    getTopMunicipiosCandidato(params.turno, cand.cd_cargo, sq, {
      uf: params.uf,
      pais: params.pais,
    }),
    presidente ? getVotosPorUfCandidato(params.turno, sq) : Promise.resolve([]),
  ])
  const cor = partyColor(cand.sg_partido)

  return (
    <Section
      id="detalhe"
      title={cand.nm_urna_candidato}
      description={`${cand.nm_candidato} · ${cand.nr_candidato}`}
      action={
        params.cand ? (
          <NavLink
            href={toSearch(params, { cand: undefined })}
            className="inline-flex min-h-9 cursor-pointer items-center rounded px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Limpar
          </NavLink>
        ) : (
          <Badge variant="secondary">Mais votado</Badge>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: cor }}
            />
            {cand.sg_partido}
          </Badge>
          <Badge variant="outline">
            {cand.ds_cargo} · {cand.sg_ue === "BR" ? "Brasil" : cand.sg_ue}
          </Badge>
          <SituacaoBadge situacao={cand.situacao} />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Total de votos válidos
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {fmtInt(cand.votos_total)}
          </p>
        </div>

        {presidente && cand.situacao === "2º TURNO" && (
          <NavLink
            href={toSearch(params, {
              turno: 2,
              cargo: undefined,
              cand: undefined,
              q: undefined,
              page: undefined,
            })}
            className="inline-flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 text-sm font-medium transition-colors duration-150 hover:bg-amber-500/20"
          >
            Ver o resultado do 2º turno
            <ArrowRightIcon aria-hidden className="size-4" />
          </NavLink>
        )}

        {porUf.length > 0 && (
          <LocalList
            title="Melhores UFs"
            items={porUf.slice(0, 5).map((u) => ({
              ...u,
              local: nomeUf(u.local),
            }))}
            cor={cor}
          />
        )}

        <LocalList
          title={`${params.uf === EXTERIOR ? "Cidades" : "Municípios"} com mais votos${
            params.pais
              ? ` em ${params.pais}`
              : params.uf
                ? ` em ${params.uf === EXTERIOR ? "outros países" : nomeUf(params.uf)}`
                : ""
          }`}
          items={municipios.map((m) => ({
            ...m,
            local:
              m.sg_uf === EXTERIOR
                ? params.pais
                  ? m.local
                  : `${m.local} (${m.nm_pais ?? "Exterior"})`
                : params.uf
                  ? m.local
                  : `${m.local} (${m.sg_uf})`,
          }))}
          cor={cor}
          vazio="Sem votos neste recorte"
        />
      </div>
    </Section>
  )
}

function LocalList({
  title,
  items,
  cor,
  vazio,
}: {
  title: string
  items: { local: string; votos: number; pct: number }[]
  cor: string
  vazio?: string
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.local} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{item.local}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {fmtInt(item.votos)} ·{" "}
                  <span className="text-foreground">{fmtPct(item.pct)}</span>
                </span>
              </div>
              <PctBar value={item.pct} color={cor} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const TOP_PARTIDOS = 6

function PartidosDonut({
  partidos,
  validos,
}: {
  partidos: VotosPartido[]
  validos: number
}) {
  if (!partidos.length) return <EmptyState title="Sem votos neste recorte" />
  const principais = partidos.slice(0, TOP_PARTIDOS)
  const outros = partidos.slice(TOP_PARTIDOS)
  const cores = distinctPartyColors(principais.map((p) => p.sg_partido))
  const somaOutros = outros.reduce((acc, p) => acc + p.votos, 0)
  const data = principais.map((p, i) => ({
    key: `partido-${i}`,
    label: p.sg_partido,
    value: p.votos,
    fill: cores[i]!,
  }))
  if (somaOutros > 0) {
    data.push({
      key: "outros",
      label: `Outros (${outros.length})`,
      value: somaOutros,
      fill: OUTROS_COLOR,
    })
  }
  const [lider] = principais
  return (
    <DonutChart
      summary={`${lider?.sg_partido} tem ${fmtPct((100 * (lider?.votos ?? 0)) / (validos || 1))} dos votos válidos.`}
      centerValue={fmtCompact(validos)}
      centerLabel="válidos"
      data={data}
    />
  )
}

function ComposicaoDonut({ resumo }: { resumo: Resumo }) {
  const brancos = resumo.brancos ?? 0
  const nulos = resumo.nulos ?? 0
  const total = resumo.validos + brancos + nulos
  return (
    <DonutChart
      summary={`Dos ${fmtInt(total)} votos, ${fmtPct((100 * resumo.validos) / (total || 1))} foram válidos.`}
      centerValue={fmtCompact(total)}
      centerLabel="votos"
      data={[
        {
          key: "validos",
          label: "Válidos",
          value: resumo.validos,
          fill: "var(--primary)",
        },
        {
          key: "brancos",
          label: "Brancos",
          value: brancos,
          fill: "var(--chart-4)",
        },
        { key: "nulos", label: "Nulos", value: nulos, fill: "var(--chart-1)" },
      ]}
    />
  )
}

function EleitosDonut({
  eleitos,
  cargo,
}: {
  eleitos: EleitosPartido[]
  cargo: number
}) {
  if (!eleitos.length) {
    return (
      <EmptyState title="Ninguém eleito no 1º turno">
        {cargo === 3
          ? "Nesta UF a disputa para Governador foi ao 2º turno."
          : "Não há eleitos neste recorte."}
      </EmptyState>
    )
  }
  const principais = eleitos.slice(0, TOP_PARTIDOS)
  const outros = eleitos.slice(TOP_PARTIDOS)
  const cores = distinctPartyColors(principais.map((p) => p.sg_partido))
  const total = eleitos.reduce((acc, p) => acc + p.eleitos, 0)
  const data = principais.map((p, i) => ({
    key: `eleitos-${i}`,
    label: p.sg_partido,
    value: p.eleitos,
    fill: cores[i]!,
  }))
  if (outros.length) {
    data.push({
      key: "outros",
      label: `Outros (${outros.length})`,
      value: outros.reduce((acc, p) => acc + p.eleitos, 0),
      fill: OUTROS_COLOR,
    })
  }
  const [maior] = principais
  return (
    <DonutChart
      summary={`${fmtInt(total)} eleitos; ${maior?.sg_partido} elegeu ${maior?.eleitos}.`}
      centerValue={fmtInt(total)}
      centerLabel={total === 1 ? "eleito" : "eleitos"}
      data={data}
    />
  )
}
