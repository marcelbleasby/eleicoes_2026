import type { Metadata } from "next"
import { Filters } from "@/components/dashboard/filters"
import {
  DashboardNavProvider,
  PendingArea,
  PendingIndicator,
} from "@/components/dashboard/navigation"
import { PrimeiroTurno } from "@/components/dashboard/primeiro-turno"
import { SegundoTurno } from "@/components/dashboard/segundo-turno"
import { TurnoTabs } from "@/components/dashboard/turno-tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BRASIL,
  EXTERIOR,
  nomeUf,
  parseParams,
  type DashboardParams,
} from "@/lib/params"
import {
  getFinalistas,
  getMunicipio,
  getMunicipios,
  getPaises,
  type Municipio,
} from "@/lib/queries"

export const metadata: Metadata = {
  title: "Eleições 2026 · Resultados",
  description:
    "Resultados do 1º e do 2º turno das Eleições 2026 por cargo, UF e município, com dados do TSE.",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = parseParams(await searchParams)
  const exterior = params.uf === EXTERIOR

  const paises = exterior ? await getPaises() : []
  if (params.pais && !paises.some((p) => p.nm_pais === params.pais)) {
    params.pais = undefined
  }

  const [municipios, municipio, finalistas] = await Promise.all([
    params.uf && params.uf !== BRASIL
      ? getMunicipios(params.uf, params.pais)
      : Promise.resolve([]),
    params.mun ? getMunicipio(params.mun) : Promise.resolve(undefined),
    params.turno === 2 ? getFinalistas() : Promise.resolve([]),
  ])

  if (
    params.mun &&
    (municipio?.sg_uf !== params.uf ||
      (params.pais && municipio?.nm_pais !== params.pais))
  ) {
    params.mun = undefined
  }

  const escopo = descreverEscopo(params, municipio)

  return (
    <DashboardNavProvider>
      <PendingIndicator />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 text-sm sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium tracking-widest text-primary uppercase">
              Eleições Gerais 2026
            </p>
            <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-3xl">
              Resultados por turno
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground sm:block">
              Votação por cargo, UF e município. Use os filtros para mudar o
              recorte e a pesquisa para achar um candidato.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <TurnoTabs params={params} />

        <Filters
          key={params.turno}
          params={params}
          municipios={municipios}
          paises={paises}
          finalistas={finalistas}
        />

        <main>
          <PendingArea>
            {params.turno === 1 ? (
              <PrimeiroTurno params={params} escopo={escopo} />
            ) : (
              <SegundoTurno params={params} escopo={escopo} />
            )}
          </PendingArea>
        </main>

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Fonte: TSE, arquivos votacao_candidato_munzona (1º turno) e
          votacao_secao (Presidente, 1º e 2º turno). O país de cada cidade do
          exterior foi atribuído manualmente (carga_exterior.sql). O 2º turno
          para Governador não está nos arquivos carregados.
        </footer>
      </div>
    </DashboardNavProvider>
  )
}

function descreverEscopo(
  params: DashboardParams,
  municipio?: Municipio & { sg_uf: string }
) {
  if (params.mun && municipio) {
    const onde =
      municipio.sg_uf === EXTERIOR
        ? (municipio.nm_pais ?? "Exterior")
        : municipio.sg_uf
    return `${municipio.nm_municipio} (${onde})`
  }
  if (params.pais) return `${params.pais} (exterior)`
  if (params.uf === BRASIL) return "Brasil, sem exterior"
  if (params.uf) return nomeUf(params.uf)
  return params.cargo === 1 ? "Brasil + exterior" : "Brasil"
}
