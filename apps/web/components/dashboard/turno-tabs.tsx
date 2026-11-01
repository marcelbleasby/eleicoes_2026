import { cn } from "@workspace/ui/lib/utils"
import { NavLink } from "@/components/dashboard/navigation"
import { toSearch, type DashboardParams, type Turno } from "@/lib/params"

const TURNOS: { turno: Turno; label: string; data: string; detalhe: string }[] =
  [
    {
      turno: 1,
      label: "1º turno",
      data: "4 de outubro",
      detalhe: "todos os cargos",
    },
    {
      turno: 2,
      label: "2º turno",
      data: "25 de outubro",
      detalhe: "Presidente",
    },
  ]

export function TurnoTabs({ params }: { params: DashboardParams }) {
  return (
    <nav aria-label="Turno da eleição">
      <ul className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto">
        {TURNOS.map(({ turno, label, data, detalhe }) => {
          const ativo = params.turno === turno
          return (
            <li key={turno} className="flex-1 sm:flex-none">
              <NavLink
                href={toSearch(params, {
                  turno,
                  cargo: turno === 2 ? undefined : params.cargo,
                  q: undefined,
                  cand: undefined,
                  page: undefined,
                  vencedor: undefined,
                  ordem: undefined,
                })}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 py-1.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4",
                  ativo
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {data}
                  <span className="hidden sm:inline"> · {detalhe}</span>
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
