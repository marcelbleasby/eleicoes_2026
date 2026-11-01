"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format"

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", callback)
      return () => media.removeEventListener("change", callback)
    },
    [query]
  )
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)")
}

/** Telas estreitas (abaixo do breakpoint sm do Tailwind). */
function useCompact() {
  return useMediaQuery("(max-width: 639px)")
}

export type RankingDatum = {
  nome: string
  votos: number
  pct: number
  fill: string
}

export function RankingChart({
  data,
  summary,
}: {
  data: RankingDatum[]
  summary: string
}) {
  const reduceMotion = useReducedMotion()
  const compact = useCompact()
  const config = { votos: { label: "Votos" } } satisfies ChartConfig
  const height = Math.max(160, data.length * (compact ? 32 : 36) + 16)

  return (
    <figure role="img" aria-label={summary} className="m-0">
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: compact ? 52 : 64, top: 0, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" dataKey="votos" hide />
          <YAxis
            dataKey="nome"
            type="category"
            width={compact ? 104 : 150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: compact ? 11 : 12 }}
            tickFormatter={(value: string) =>
              compact && value.length > 16 ? `${value.slice(0, 15)}…` : value
            }
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.4 }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-medium tabular-nums">
                      {fmtInt(Number(value))} votos
                    </span>
                    <span className="text-muted-foreground">
                      {fmtPct((item.payload as RankingDatum).pct)} dos válidos
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="votos"
            radius={4}
            maxBarSize={26}
            isAnimationActive={!reduceMotion}
          >
            <LabelList
              dataKey="pct"
              position="right"
              className="fill-foreground font-mono"
              fontSize={compact ? 11 : 12}
              formatter={(value: unknown) => fmtPct(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

export type Finalist = { key: "a" | "b"; nome: string; cor: string }

export function TurnoComparisonChart({
  finalistas,
  data,
}: {
  finalistas: Finalist[]
  data: { turno: string; a: number; b: number }[]
}) {
  const reduceMotion = useReducedMotion()
  const config = Object.fromEntries(
    finalistas.map((f) => [f.key, { label: f.nome, color: f.cor }])
  ) satisfies ChartConfig

  const summary = data
    .map(
      (d) =>
        `${d.turno}: ${finalistas
          .map((f) => `${f.nome} ${fmtPct(d[f.key])}`)
          .join(", ")}`
    )
    .join(". ")

  return (
    <figure role="img" aria-label={summary} className="m-0">
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart
          data={data}
          margin={{ top: 20, left: 0, right: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="turno" tickLine={false} axisLine={false} />
          <YAxis hide domain={[0, 100]} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-3">
                    <span>{config[name as "a" | "b"]?.label}</span>
                    <span className="font-mono tabular-nums">
                      {fmtPct(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {finalistas.map((f) => (
            <Bar
              key={f.key}
              dataKey={f.key}
              fill={`var(--color-${f.key})`}
              radius={4}
              isAnimationActive={!reduceMotion}
            >
              <LabelList
                dataKey={f.key}
                position="top"
                className="fill-foreground font-mono"
                fontSize={12}
                formatter={(value: unknown) => fmtPct(Number(value))}
              />
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  )
}

export function StackedShareChart({
  finalistas,
  data,
  summary,
  height = 288,
  minBarWidth = 22,
  angledLabels = false,
}: {
  finalistas: Finalist[]
  data: {
    label: string
    a: number
    b: number
    votos_a: number
    votos_b: number
  }[]
  summary: string
  height?: number
  /** Largura mínima de cada barra; abaixo disso o gráfico passa a rolar. */
  minBarWidth?: number
  /** Inclina os rótulos do eixo X (para nomes longos, como países). */
  angledLabels?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const config = Object.fromEntries(
    finalistas.map((f) => [f.key, { label: f.nome, color: f.cor }])
  ) satisfies ChartConfig

  // Largura mínima para os rótulos não se sobreporem; em telas estreitas o gráfico rola.
  const minWidth = data.length * minBarWidth + 48

  return (
    <figure role="img" aria-label={summary} className="m-0">
      <p
        className={cn(
          "mb-2 text-xs text-muted-foreground",
          minWidth > 680 ? "lg:hidden" : "md:hidden"
        )}
        aria-hidden
      >
        Arraste o gráfico para o lado para ver todos.
      </p>
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
        <ChartContainer
          config={config}
          className="aspect-auto w-full"
          style={{ height, minWidth }}
        >
          <BarChart
            data={data}
            margin={{ top: 8, left: angledLabels ? 28 : 0, right: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11 }}
              angle={angledLabels ? -35 : 0}
              textAnchor={angledLabels ? "end" : "middle"}
              height={angledLabels ? 64 : 30}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const key = name as "a" | "b"
                    const votos = (item.payload as Record<string, number>)[
                      `votos_${key}`
                    ]
                    return (
                      <span className="flex w-full justify-between gap-3">
                        <span>{config[key]?.label}</span>
                        <span className="font-mono tabular-nums">
                          {fmtPct(Number(value))} · {fmtCompact(votos)}
                        </span>
                      </span>
                    )
                  }}
                />
              }
            />
            {finalistas.map((f) => (
              <Bar
                key={f.key}
                dataKey={f.key}
                stackId="share"
                fill={`var(--color-${f.key})`}
                isAnimationActive={!reduceMotion}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        {finalistas.map((f) => (
          <li key={f.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm"
              style={{ background: f.cor }}
            />
            {f.nome}
          </li>
        ))}
      </ul>
    </figure>
  )
}

export type Slice = {
  key: string
  label: string
  value: number
  fill: string
  hint?: string
}

/**
 * Gráfico de setores em formato de rosca, com legenda em lista
 * (a lista também serve de alternativa textual ao gráfico).
 */
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  summary,
  formatValue = fmtInt,
  showPct = true,
}: {
  data: Slice[]
  centerValue: string
  centerLabel: string
  summary: string
  formatValue?: (value: number) => string
  showPct?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const total = data.reduce((acc, slice) => acc + slice.value, 0)
  const config = Object.fromEntries(
    data.map((slice) => [slice.key, { label: slice.label, color: slice.fill }])
  ) satisfies ChartConfig

  return (
    <div className="@container">
      <div className="grid items-center gap-4 @sm:grid-cols-[minmax(0,9rem)_1fr]">
        <div role="img" aria-label={summary}>
          <ChartContainer
            config={config}
            className="mx-auto aspect-square w-full max-w-36"
            initialDimension={{ width: 160, height: 160 }}
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                    formatter={(value, _name, item) => {
                      const slice = item.payload as Slice
                      return (
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="size-2.5 rounded-sm"
                              style={{ background: slice.fill }}
                            />
                            {slice.label}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatValue(Number(value))}
                            {showPct && total > 0
                              ? ` · ${fmtPct((100 * Number(value)) / total)}`
                              : ""}
                          </span>
                        </span>
                      )
                    }}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="key"
                innerRadius="62%"
                outerRadius="100%"
                paddingAngle={data.length > 1 ? 1.5 : 0}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={!reduceMotion}
              >
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox)) return null
                    const { cx, cy } = viewBox as { cx: number; cy: number }
                    return (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={cx}
                          y={cy - 6}
                          className="fill-foreground font-mono text-[13px] font-semibold"
                        >
                          {centerValue}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 11}
                          className="fill-muted-foreground text-[10px]"
                        >
                          {centerLabel}
                        </tspan>
                      </text>
                    )
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        <ul className="flex w-full max-w-md min-w-0 flex-col gap-2 text-sm">
          {data.map((slice) => (
            <li
              key={slice.key}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2"
            >
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ background: slice.fill }}
              />
              <span
                className="min-w-0 leading-tight break-words"
                title={slice.hint ?? slice.label}
              >
                {slice.label}
              </span>
              <span className="text-right font-mono text-xs tabular-nums">
                {showPct && total > 0
                  ? fmtPct((100 * slice.value) / total)
                  : formatValue(slice.value)}
              </span>
              {showPct && (
                <span className="col-start-2 col-end-4 font-mono text-[11px] leading-tight text-muted-foreground tabular-nums">
                  {formatValue(slice.value)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
