"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { CandidateSearch } from "@/components/dashboard/candidate-search"
import { useDashboardNav } from "@/components/dashboard/navigation"
import {
  BRASIL,
  CARGOS,
  EXTERIOR,
  toSearch,
  UFS,
  ufsDoCargo,
  type DashboardParams,
} from "@/lib/params"

const ALL = "__all__"

type Option = { value: string; label: string }
type OptionGroup = { label?: string; options: Option[] }

function FilterSelect({
  id,
  label,
  value,
  groups,
  onChange,
  disabled,
  className,
}: {
  id: string
  label: string
  value: string
  groups: OptionGroup[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  const items = React.useMemo(
    () =>
      Object.fromEntries(
        groups.flatMap((g) => g.options.map((o) => [o.value, o.label]))
      ),
    [groups]
  )
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next)
        }}
      >
        <SelectTrigger
          id={id}
          className="h-10 w-full cursor-pointer text-sm data-[size=default]:h-10"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {groups.map((group, index) => (
            <React.Fragment key={group.label ?? index}>
              {index > 0 && <SelectSeparator />}
              <SelectGroup>
                {group.label && (
                  <SelectLabel className="text-xs font-semibold">
                    {group.label}
                  </SelectLabel>
                )}
                {group.options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="min-h-9 cursor-pointer text-sm"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Pesquisa simples com espera antes de aplicar (usada para municípios no 2º turno). */
function SearchField({
  id,
  label,
  placeholder,
  value,
  onSearch,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onSearch: (value: string) => void
}) {
  const [text, setText] = React.useState(value)
  const lastSent = React.useRef(value)

  React.useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value
      setText(value)
    }
  }, [value])

  React.useEffect(() => {
    if (text.trim() === lastSent.current) return
    const timer = setTimeout(() => {
      lastSent.current = text.trim()
      onSearch(text.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [text, onSearch])

  return (
    <div className="min-w-0 flex-1 basis-64">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-10 pr-10 pl-9 text-sm md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpar pesquisa"
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2 cursor-pointer"
            onClick={() => {
              setText("")
              lastSent.current = ""
              onSearch("")
            }}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  )
}

export function Filters({
  params,
  municipios,
  paises,
  finalistas,
}: {
  params: DashboardParams
  municipios: {
    cd_municipio: number
    nm_municipio: string
    nm_pais: string | null
  }[]
  paises: { nm_pais: string; nm_regiao: string }[]
  finalistas: { sq_candidato: string; nm_urna_candidato: string }[]
}) {
  const { navigate } = useDashboardNav()
  const segundoTurno = params.turno === 2
  const presidente = params.cargo === 1
  const exterior = params.uf === EXTERIOR

  const go = React.useCallback(
    (changes: Parameters<typeof toSearch>[1]) =>
      navigate(toSearch(params, { page: undefined, ...changes })),
    [navigate, params]
  )

  const onSearchMunicipio = React.useCallback(
    (q: string) => go({ q: q || undefined }),
    [go]
  )

  const ufGroups: OptionGroup[] = presidente
    ? [
        {
          options: [
            { value: ALL, label: "Brasil + exterior" },
            { value: BRASIL, label: "Só Brasil" },
            { value: EXTERIOR, label: "Exterior" },
          ],
        },
        {
          label: "Unidades da federação",
          options: UFS.map((uf) => ({ value: uf, label: uf })),
        },
      ]
    : [
        {
          options: [
            { value: ALL, label: "Brasil (todas)" },
            ...ufsDoCargo(params.cargo).map((uf) => ({ value: uf, label: uf })),
          ],
        },
      ]

  const paisGroups: OptionGroup[] = React.useMemo(() => {
    const porRegiao = new Map<string, Option[]>()
    for (const p of paises) {
      const lista = porRegiao.get(p.nm_regiao) ?? []
      lista.push({ value: p.nm_pais, label: p.nm_pais })
      porRegiao.set(p.nm_regiao, lista)
    }
    return [
      { options: [{ value: ALL, label: "Todos os países" }] },
      ...[...porRegiao].map(([label, options]) => ({ label, options })),
    ]
  }, [paises])

  const munGroups: OptionGroup[] = [
    {
      options: [
        {
          value: ALL,
          label: exterior
            ? "Todas as cidades"
            : params.uf && params.uf !== BRASIL
              ? "Todos os municípios"
              : "Escolha uma UF",
        },
        ...municipios.map((m) => ({
          value: String(m.cd_municipio),
          label:
            exterior && !params.pais && m.nm_pais
              ? `${m.nm_municipio} (${m.nm_pais})`
              : m.nm_municipio,
        })),
      ],
    },
  ]

  return (
    <form
      role="search"
      aria-label="Filtros da dashboard"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-3"
    >
      {!segundoTurno && (
        <FilterSelect
          id="filtro-cargo"
          label="Cargo"
          value={String(params.cargo)}
          groups={[
            {
              options: CARGOS.map((c) => ({
                value: String(c.id),
                label: c.nome,
              })),
            },
          ]}
          className="w-full sm:w-48"
          onChange={(value) =>
            go({
              cargo: value,
              uf: undefined,
              mun: undefined,
              pais: undefined,
              cand: undefined,
              q: undefined,
            })
          }
        />
      )}
      <FilterSelect
        id="filtro-uf"
        label={presidente ? "Recorte" : "UF"}
        value={params.uf ?? ALL}
        groups={ufGroups}
        className="w-[calc(50%-0.375rem)] sm:w-44"
        onChange={(value) =>
          go({
            uf: value === ALL ? undefined : value,
            mun: undefined,
            pais: undefined,
            cand: presidente ? params.cand : undefined,
          })
        }
      />
      {exterior && (
        <FilterSelect
          id="filtro-pais"
          label="País"
          value={params.pais ?? ALL}
          groups={paisGroups}
          className="w-[calc(50%-0.375rem)] sm:w-52"
          onChange={(value) =>
            go({ pais: value === ALL ? undefined : value, mun: undefined })
          }
        />
      )}
      <FilterSelect
        id="filtro-municipio"
        label={exterior ? "Cidade" : "Município"}
        value={params.mun ? String(params.mun) : ALL}
        groups={munGroups}
        disabled={!params.uf || params.uf === BRASIL}
        className="w-[calc(50%-0.375rem)] sm:w-56"
        onChange={(value) => go({ mun: value === ALL ? undefined : value })}
      />
      {segundoTurno && (
        <FilterSelect
          id="filtro-vencedor"
          label="Candidato vencedor"
          value={params.vencedor ?? ALL}
          groups={[
            {
              options: [
                { value: ALL, label: "Todos" },
                ...finalistas.map((f) => ({
                  value: f.sq_candidato,
                  label: f.nm_urna_candidato,
                })),
              ],
            },
          ]}
          className="w-[calc(50%-0.375rem)] sm:w-52"
          onChange={(value) =>
            go({ vencedor: value === ALL ? undefined : value })
          }
        />
      )}
      {segundoTurno ? (
        <SearchField
          id="filtro-busca"
          label={exterior ? "Pesquisar cidade ou país" : "Pesquisar município"}
          placeholder={exterior ? "Ex.: Lisboa ou Japão" : "Ex.: Fortaleza"}
          value={params.q ?? ""}
          onSearch={onSearchMunicipio}
        />
      ) : (
        <CandidateSearch
          key={`${params.cargo}-${params.q ?? ""}`}
          params={params}
        />
      )}
    </form>
  )
}
