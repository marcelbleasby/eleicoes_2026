import {
  ArrowDownIcon,
  ArrowUpIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  FileXIcon,
  TrophyIcon,
  VoteIcon,
} from "lucide-react"
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
  TurnoComparisonChart,
  type Finalist,
} from "@/components/dashboard/charts"
import { Exterior2T } from "@/components/dashboard/exterior"
import { NavLink } from "@/components/dashboard/navigation"
import { EmptyState, KpiCard, Pager, Section } from "@/components/dashboard/ui"
import {
  fmtCompact,
  fmtDelta,
  fmtDeltaInt,
  fmtInt,
  fmtPct,
  partyColor,
} from "@/lib/format"
import {
  BRASIL,
  EXTERIOR,
  nomeUf,
  toSearch,
  type DashboardParams,
  type Ordem2T,
} from "@/lib/params"
import {
  getBrasilExterior2T,
  getMunicipios2T,
  getResultadoPorUf2T,
  getResumo2T,
  type BrasilExterior,
  type Finalista,
  type Municipio2T,
} from "@/lib/queries"

export async function SegundoTurno({
  params,
  escopo,
}: {
  params: DashboardParams
  escopo: string
}) {
  const resumo = await getResumo2T(params)
  const exterior = params.uf === EXTERIOR
  const [a, b] = resumo.finalistas
  if (!a || !b) {
    return (
      <Section title="2º turno">
        <EmptyState title="Dados do 2º turno não encontrados">
          Rode carga_votacao_secao.sql e carga_dashboard.sql para carregar o 2º
          turno.
        </EmptyState>
      </Section>
    )
  }

  const nacional = !params.uf
  const [municipios, porUf, brasilExterior] = await Promise.all([
    getMunicipios2T(params, a.sq_candidato, b.sq_candidato),
    nacional || params.uf === BRASIL
      ? getResultadoPorUf2T(a.sq_candidato, b.sq_candidato)
      : Promise.resolve([]),
    nacional ? getBrasilExterior2T() : Promise.resolve([]),
  ])

  const finalistas: Finalist[] = [
    { key: "a", nome: a.nm_urna_candidato, cor: partyColor(a.sg_partido) },
    { key: "b", nome: b.nm_urna_candidato, cor: partyColor(b.sg_partido) },
  ]
  const totalMun = municipios[0]?.total ?? 0
  const total2 = resumo.validos_2t + resumo.brancos_2t + resumo.nulos_2t

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={VoteIcon}
          label="Votos válidos"
          value={fmtInt(resumo.validos_2t)}
          hint={`${fmtDeltaInt(resumo.validos_2t - resumo.validos_1t)} em relação ao 1º turno`}
        />
        <KpiCard
          icon={FileXIcon}
          label="Brancos"
          value={fmtInt(resumo.brancos_2t)}
          hint={`${fmtPct((100 * resumo.brancos_2t) / (total2 || 1))} dos votos · 1º turno: ${fmtCompact(resumo.brancos_1t)}`}
        />
        <KpiCard
          icon={FileXIcon}
          label="Nulos"
          value={fmtInt(resumo.nulos_2t)}
          hint={`${fmtPct((100 * resumo.nulos_2t) / (total2 || 1))} dos votos · 1º turno: ${fmtCompact(resumo.nulos_1t)}`}
        />
        <KpiCard
          icon={Building2Icon}
          label={exterior ? "Cidades no exterior" : "Municípios"}
          value={fmtInt(resumo.municipios)}
          hint={`${escopo} · com votação no 2º turno`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
          title="Presidente · 2º turno"
          description={`${escopo} · % dos votos válidos`}
        >
          <HeadToHead
            a={a}
            b={b}
            cores={[finalistas[0]!.cor, finalistas[1]!.cor]}
            nacional={nacional}
            exterior={exterior}
          />
        </Section>
        <Section
          title="1º turno × 2º turno"
          description="% dos votos válidos em cada turno"
        >
          <TurnoComparisonChart
            finalistas={finalistas}
            data={[
              { turno: "1º turno", a: a.pct_1t, b: b.pct_1t },
              { turno: "2º turno", a: a.pct_2t, b: b.pct_2t },
            ]}
          />
        </Section>
      </div>

      <div
        className={cn(
          "grid gap-4 md:grid-cols-2",
          nacional && "xl:grid-cols-3"
        )}
      >
        <Section
          title="Composição dos votos"
          description={`Votos de cada finalista, brancos e nulos · ${escopo}`}
        >
          <DonutChart
            summary={`${a.nm_urna_candidato} ${fmtInt(a.votos_2t)}, ${b.nm_urna_candidato} ${fmtInt(b.votos_2t)}, brancos ${fmtInt(resumo.brancos_2t)}, nulos ${fmtInt(resumo.nulos_2t)}.`}
            centerValue={fmtCompact(total2)}
            centerLabel="votos"
            data={[
              {
                key: "a",
                label: a.nm_urna_candidato,
                value: a.votos_2t,
                fill: finalistas[0]!.cor,
              },
              {
                key: "b",
                label: b.nm_urna_candidato,
                value: b.votos_2t,
                fill: finalistas[1]!.cor,
              },
              {
                key: "brancos",
                label: "Brancos",
                value: resumo.brancos_2t,
                fill: "var(--chart-4)",
              },
              {
                key: "nulos",
                label: "Nulos",
                value: resumo.nulos_2t,
                fill: "var(--chart-1)",
              },
            ]}
          />
        </Section>
        <Section
          title={exterior ? "Cidades vencidas" : "Municípios vencidos"}
          description={`Quem teve mais votos em cada ${exterior ? "cidade" : "município"} · ${escopo}`}
        >
          <DonutChart
            summary={`${a.nm_urna_candidato} venceu em ${fmtInt(a.municipios_vencidos)} e ${b.nm_urna_candidato} em ${fmtInt(b.municipios_vencidos)}.`}
            centerValue={fmtInt(a.municipios_vencidos + b.municipios_vencidos)}
            centerLabel={exterior ? "cidades" : "municípios"}
            data={[
              {
                key: "a",
                label: a.nm_urna_candidato,
                value: a.municipios_vencidos,
                fill: finalistas[0]!.cor,
              },
              {
                key: "b",
                label: b.nm_urna_candidato,
                value: b.municipios_vencidos,
                fill: finalistas[1]!.cor,
              },
            ]}
          />
        </Section>
        {nacional && (
          <BrasilExteriorCard
            rows={brasilExterior}
            a={a}
            b={b}
            finalistas={finalistas}
          />
        )}
      </div>

      {porUf.length > 0 && (
        <Section
          title="Resultado por UF"
          description={`Divisão dos votos válidos do 2º turno, ordenado pela votação de ${a.nm_urna_candidato}.${nacional ? " EXT = exterior." : ""}`}
        >
          <StackedShareChart
            finalistas={finalistas}
            summary={`${a.nm_urna_candidato} vence em ${porUf.filter((u) => u.pct_a > u.pct_b && u.sg_uf !== EXTERIOR).length} de 27 unidades da federação no 2º turno.`}
            data={porUf
              .filter((u) => nacional || u.sg_uf !== EXTERIOR)
              .map((u) => ({
                label: u.sg_uf === EXTERIOR ? "EXT" : u.sg_uf,
                a: u.pct_a,
                b: u.pct_b,
                votos_a: u.votos_a,
                votos_b: u.votos_b,
              }))}
          />
        </Section>
      )}

      {exterior && !params.pais && !params.mun && (
        <Exterior2T
          params={params}
          finalistas={finalistas}
          a={a.sq_candidato}
          b={b.sq_candidato}
        />
      )}

      <Section
        id="municipios"
        title={exterior ? "Resultado por cidade" : "Resultado por município"}
        description={
          params.q
            ? `${fmtInt(totalMun)} ${exterior ? "cidade(s)" : "município(s)"} para “${params.q}”`
            : `${fmtInt(totalMun)} ${exterior ? "cidades" : "municípios"} · ${escopo}`
        }
      >
        <MunicipiosTable
          params={params}
          rows={municipios}
          a={a}
          b={b}
          finalistas={finalistas}
        />
        <Pager params={params} total={totalMun} />
      </Section>
    </div>
  )
}

function HeadToHead({
  a,
  b,
  cores,
  nacional,
  exterior,
}: {
  a: Finalista
  b: Finalista
  cores: [string, string]
  nacional: boolean
  exterior: boolean
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[a, b].map((f, i) => {
          const outro = i === 0 ? b : a
          const lider = f.votos_2t > outro.votos_2t
          const deltaPct = f.pct_2t - f.pct_1t
          return (
            <div
              key={f.sq_candidato}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4",
                i === 1 && "sm:text-right"
              )}
              style={{
                borderColor: `color-mix(in oklch, ${cores[i]} 35%, transparent)`,
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-2",
                  i === 1 && "sm:flex-row-reverse"
                )}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ background: cores[i] }}
                />
                <span className="font-semibold">{f.nm_urna_candidato}</span>
                <span className="text-sm text-muted-foreground">
                  {f.sg_partido} · {f.nr_candidato}
                </span>
              </div>
              <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
                {fmtPct(f.pct_2t)}
              </p>
              <p className="font-mono text-sm tabular-nums">
                {fmtInt(f.votos_2t)} votos
              </p>
              <dl
                className={cn(
                  "grid grid-cols-2 gap-x-3 gap-y-1 text-xs",
                  i === 1 && "sm:text-right"
                )}
              >
                <dt className="text-muted-foreground">No 1º turno</dt>
                <dd className="font-mono tabular-nums">{fmtPct(f.pct_1t)}</dd>
                <dt className="text-muted-foreground">Variação</dt>
                <dd
                  className={cn(
                    "inline-flex items-center gap-0.5 font-mono tabular-nums",
                    i === 1 && "sm:justify-end"
                  )}
                >
                  {deltaPct >= 0 ? (
                    <ArrowUpIcon aria-hidden className="size-3" />
                  ) : (
                    <ArrowDownIcon aria-hidden className="size-3" />
                  )}
                  {fmtDelta(deltaPct, " p.p.")}
                </dd>
                <dt className="text-muted-foreground">Votos ganhos</dt>
                <dd className="font-mono tabular-nums">
                  {fmtDeltaInt(f.votos_2t - f.votos_1t)}
                </dd>
                <dt className="text-muted-foreground">
                  {exterior ? "Cidades vencidas" : "Municípios vencidos"}
                </dt>
                <dd className="font-mono tabular-nums">
                  {fmtInt(f.municipios_vencidos)}
                </dd>
              </dl>
              {(lider || (nacional && f.situacao === "ELEITO")) && (
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300",
                    i === 1 && "sm:ml-auto"
                  )}
                >
                  <TrophyIcon aria-hidden className="size-3" />
                  {nacional && f.situacao === "ELEITO"
                    ? "Eleito"
                    : "Vence neste recorte"}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <div
          className="relative flex h-4 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${a.nm_urna_candidato} ${fmtPct(a.pct_2t)} contra ${b.nm_urna_candidato} ${fmtPct(b.pct_2t)}`}
        >
          <div style={{ width: `${a.pct_2t}%`, background: cores[0] }} />
          <div style={{ width: `${b.pct_2t}%`, background: cores[1] }} />
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-background"
          />
        </div>
        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] gap-2 text-xs text-muted-foreground">
          <span>{a.nm_urna_candidato}</span>
          <span>50%</span>
          <span className="text-right">{b.nm_urna_candidato}</span>
        </div>
      </div>
    </div>
  )
}

const ORDENS: { ordem: Ordem2T; label: string }[] = [
  { ordem: "votos", label: "Mais votos" },
  { ordem: "margem", label: "Mais disputados" },
  { ordem: "nome", label: "Nome" },
]

/** Ordenação para telas estreitas, onde parte dos cabeçalhos fica escondida. */
function SortControl({ params }: { params: DashboardParams }) {
  return (
    <nav aria-label="Ordenar tabela" className="mb-2 md:hidden">
      <ul className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {ORDENS.map(({ ordem, label }) => {
          const ativo = params.ordem === ordem
          return (
            <li key={ordem} className="flex-1">
              <NavLink
                href={toSearch(params, { ordem, page: undefined })}
                aria-current={ativo ? "true" : undefined}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                  ativo
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SortHeader({
  params,
  ordem,
  children,
  className,
}: {
  params: DashboardParams
  ordem: Ordem2T
  children: React.ReactNode
  className?: string
}) {
  const ativo = params.ordem === ordem
  return (
    <TableHead
      aria-sort={
        ativo ? (ordem === "votos" ? "descending" : "ascending") : "none"
      }
      className={className}
    >
      <NavLink
        href={toSearch(params, { ordem, page: undefined })}
        className={cn(
          "-mx-1 inline-flex min-h-9 cursor-pointer items-center gap-1 rounded px-1 transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          ativo ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        {ativo ? (
          ordem === "votos" ? (
            <ArrowDownIcon aria-hidden className="size-3.5" />
          ) : (
            <ArrowUpIcon aria-hidden className="size-3.5" />
          )
        ) : (
          <ChevronsUpDownIcon aria-hidden className="size-3.5 opacity-50" />
        )}
      </NavLink>
    </TableHead>
  )
}

function MunicipiosTable({
  params,
  rows,
  a,
  b,
  finalistas,
}: {
  params: DashboardParams
  rows: Municipio2T[]
  a: Finalista
  b: Finalista
  finalistas: Finalist[]
}) {
  if (!rows.length) {
    return (
      <EmptyState title="Nenhum município encontrado">
        {params.q
          ? `Não achamos “${params.q}”. Confira a grafia ou tente só parte do nome (ex.: “São”).`
          : "Tente outra UF ou remova o filtro de candidato vencedor."}
      </EmptyState>
    )
  }
  const exterior = params.uf === EXTERIOR
  const mostraUf =
    !params.uf || params.uf === BRASIL || (exterior && !params.pais)
  const [ca, cb] = [finalistas[0]!.cor, finalistas[1]!.cor]
  const primeiroNome = (nome: string) => nome.split(" ")[0]

  return (
    <>
      <SortControl params={params} />
      <Table className="text-sm">
        <caption className="sr-only">
          Votos de cada finalista por município no 2º turno, com a variação em
          relação ao 1º turno.
        </caption>
        <TableHeader>
          <TableRow>
            <SortHeader params={params} ordem="nome">
              {exterior ? "Cidade" : "Município"}
            </SortHeader>
            {mostraUf && (
              <TableHead className="hidden md:table-cell">
                {exterior ? "País" : "UF"}
              </TableHead>
            )}
            <SortHeader params={params} ordem="votos" className="text-right">
              <span className="md:hidden">
                {primeiroNome(a.nm_urna_candidato)}
              </span>
              <span className="hidden md:inline">{a.nm_urna_candidato}</span>
            </SortHeader>
            <TableHead className="pr-0 text-right md:pr-2">
              <span className="md:hidden">
                {primeiroNome(b.nm_urna_candidato)}
              </span>
              <span className="hidden md:inline">{b.nm_urna_candidato}</span>
            </TableHead>
            <TableHead className="hidden w-36 lg:table-cell">Divisão</TableHead>
            <SortHeader
              params={params}
              ordem="margem"
              className="hidden text-right md:table-cell"
            >
              Margem
            </SortHeader>
            <TableHead className="hidden lg:table-cell">Vencedor</TableHead>
            <TableHead className="hidden text-right lg:table-cell">
              <abbr
                title={`Variação de ${a.nm_urna_candidato} em relação ao 1º turno, em pontos percentuais`}
                className="no-underline"
              >
                Var. {a.nm_urna_candidato.split(" ")[0]}
              </abbr>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const vencedor =
              row.vencedor === a.sq_candidato
                ? a
                : row.vencedor === b.sq_candidato
                  ? b
                  : null
            const corVencedor = vencedor === a ? ca : cb
            const deltaA =
              row.pct_a_1t == null ? null : row.pct_a - row.pct_a_1t
            const local =
              row.sg_uf === EXTERIOR
                ? (row.nm_pais ?? "Exterior")
                : nomeUf(row.sg_uf)
            const margem = fmtDelta(row.margem, " p.p.").replace(/^\+/, "")
            return (
              <TableRow key={row.cd_municipio}>
                <TableCell className="max-w-[42vw] font-medium whitespace-normal md:max-w-none md:whitespace-nowrap">
                  {params.uf && params.uf !== BRASIL ? (
                    <NavLink
                      href={toSearch(params, {
                        mun: row.cd_municipio,
                        page: undefined,
                        q: undefined,
                      })}
                      className="-mx-1 inline-flex min-h-9 cursor-pointer items-center rounded px-1 underline-offset-4 hover:text-primary hover:underline"
                    >
                      {row.nm_municipio}
                    </NavLink>
                  ) : (
                    <span className="block leading-snug">
                      {row.nm_municipio}
                    </span>
                  )}
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground md:hidden">
                    {mostraUf && `${local} · `}margem {margem}
                  </span>
                  <div
                    aria-hidden
                    className="relative mt-1.5 flex h-1.5 max-w-32 overflow-hidden rounded-full bg-muted md:hidden"
                  >
                    <div style={{ width: `${row.pct_a}%`, background: ca }} />
                    <div style={{ width: `${row.pct_b}%`, background: cb }} />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-background" />
                  </div>
                </TableCell>
                {mostraUf && (
                  <TableCell className="hidden md:table-cell">
                    {local}
                  </TableCell>
                )}
                <TableCell className="text-right align-top font-mono tabular-nums md:align-middle">
                  <div className={cn(vencedor === a && "font-semibold")}>
                    {fmtPct(row.pct_a)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtInt(row.votos_a)}
                  </div>
                </TableCell>
                <TableCell className="pr-0 text-right align-top font-mono tabular-nums md:pr-2 md:align-middle">
                  <div className={cn(vencedor === b && "font-semibold")}>
                    {fmtPct(row.pct_b)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtInt(row.votos_b)}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div
                    aria-hidden
                    className="relative flex h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div style={{ width: `${row.pct_a}%`, background: ca }} />
                    <div style={{ width: `${row.pct_b}%`, background: cb }} />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-background" />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">
                  {margem}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {vencedor ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ background: corVencedor }}
                      />
                      {vencedor.nm_urna_candidato}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Empate</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">
                  {fmtDelta(deltaA, " p.p.")}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

function BrasilExteriorCard({
  rows,
  a,
  b,
  finalistas,
}: {
  rows: BrasilExterior[]
  a: Finalista
  b: Finalista
  finalistas: Finalist[]
}) {
  const votos = (regiao: BrasilExterior["regiao"], sq: string) =>
    rows.find((r) => r.regiao === regiao && r.sq_candidato === sq)?.votos ?? 0
  const extA = votos("Exterior", a.sq_candidato)
  const extB = votos("Exterior", b.sq_candidato)
  const brA = votos("Brasil", a.sq_candidato)
  const brB = votos("Brasil", b.sq_candidato)
  const pct = (x: number, y: number) => (100 * x) / (x + y || 1)

  return (
    <Section
      title="Brasil × exterior"
      description={`${fmtInt(extA + extB)} votos válidos no exterior`}
    >
      <DonutChart
        summary={`No exterior, ${a.nm_urna_candidato} teve ${fmtPct(pct(extA, extB))} e ${b.nm_urna_candidato} ${fmtPct(pct(extB, extA))}.`}
        centerValue={fmtPct(pct(extA, extB))}
        centerLabel={`${a.nm_urna_candidato.split(" ")[0]} no exterior`}
        data={[
          {
            key: "a",
            label: a.nm_urna_candidato,
            value: extA,
            fill: finalistas[0]!.cor,
          },
          {
            key: "b",
            label: b.nm_urna_candidato,
            value: extB,
            fill: finalistas[1]!.cor,
          },
        ]}
      />
      <dl className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 border-t pt-3 text-xs">
        <dt className="text-muted-foreground">Só no Brasil</dt>
        <dd className="font-mono tabular-nums">
          {a.nm_urna_candidato.split(" ")[0]} {fmtPct(pct(brA, brB))}
        </dd>
        <dd className="font-mono tabular-nums">
          {b.nm_urna_candidato.split(" ")[0]} {fmtPct(pct(brB, brA))}
        </dd>
      </dl>
    </Section>
  )
}
