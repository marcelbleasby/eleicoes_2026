import { ChevronLeftIcon, ChevronRightIcon, SearchXIcon } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { NavLink } from "@/components/dashboard/navigation"
import { fmtInt } from "@/lib/format"
import { PAGE_SIZE, toSearch, type DashboardParams } from "@/lib/params"

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
}: {
  label: string
  value: string
  hint?: React.ReactNode
  valueClassName?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="min-w-0 gap-1 py-3 sm:py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 px-3 sm:px-4">
        <CardDescription className="text-xs leading-snug sm:text-sm">
          {label}
        </CardDescription>
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="min-w-0 px-3 sm:px-4">
        <p
          className={cn(
            "truncate font-mono text-lg font-semibold tracking-tight tabular-nums sm:text-2xl",
            valueClassName
          )}
          title={value}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const headingId = id ? `${id}-titulo` : undefined
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("min-w-0", className)}
    >
      <Card className="h-full gap-3 py-4 text-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 px-3 sm:px-4">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">
              <h2 id={headingId}>{title}</h2>
            </CardTitle>
            {description && (
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            )}
          </div>
          {action}
        </CardHeader>
        <CardContent className="px-3 sm:px-4">{children}</CardContent>
      </Card>
    </section>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchXIcon aria-hidden className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {children && (
        <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  )
}

export function Pager({
  params,
  total,
}: {
  params: DashboardParams
  total: number
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (total === 0) return null
  const start = (params.page - 1) * PAGE_SIZE + 1
  const end = Math.min(total, params.page * PAGE_SIZE)
  const linkClass = cn(
    buttonVariants({ variant: "outline", size: "lg" }),
    "h-10 flex-1 cursor-pointer px-3 text-sm sm:flex-none"
  )
  const disabledClass = "pointer-events-none opacity-40"

  return (
    <nav
      aria-label="Paginação"
      className="mt-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground">
        <span className="font-mono tabular-nums">
          {fmtInt(start)}–{fmtInt(end)}
        </span>{" "}
        de <span className="font-mono tabular-nums">{fmtInt(total)}</span>
      </p>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <PagerLink
          href={toSearch(params, { page: params.page - 1 })}
          disabled={params.page <= 1}
          className={linkClass}
          disabledClass={disabledClass}
        >
          <ChevronLeftIcon aria-hidden />
          Anterior
        </PagerLink>
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          <span className="sr-only sm:not-sr-only">Página </span>
          {params.page}
          <span className="sm:hidden">/</span>
          <span className="hidden sm:inline"> de </span>
          {fmtInt(pages)}
        </span>
        <PagerLink
          href={toSearch(params, { page: params.page + 1 })}
          disabled={params.page >= pages}
          className={linkClass}
          disabledClass={disabledClass}
        >
          Próxima
          <ChevronRightIcon aria-hidden />
        </PagerLink>
      </div>
    </nav>
  )
}

function PagerLink({
  href,
  disabled,
  className,
  disabledClass,
  children,
}: {
  href: string
  disabled: boolean
  className: string
  disabledClass: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(className, disabledClass)}>
        {children}
      </span>
    )
  }
  return (
    <NavLink href={href} className={className}>
      {children}
    </NavLink>
  )
}

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const eleito = situacao.startsWith("ELEITO")
  const segundo = situacao === "2º TURNO"
  const suplente = situacao === "SUPLENTE"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        eleito &&
          "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
        segundo &&
          "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        suplente && "border-border bg-muted text-foreground",
        !eleito &&
          !segundo &&
          !suplente &&
          "border-transparent text-muted-foreground"
      )}
    >
      {situacao.charAt(0) + situacao.slice(1).toLowerCase()}
    </span>
  )
}

export function PctBar({
  value,
  color,
  label,
}: {
  value: number
  color: string
  label?: string
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="presentation"
      aria-label={label}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
        }}
      />
    </div>
  )
}
