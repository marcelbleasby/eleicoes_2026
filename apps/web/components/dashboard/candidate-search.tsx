"use client"

import * as React from "react"
import { FilterIcon, LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import {
  scrollToIfHidden,
  useDashboardNav,
} from "@/components/dashboard/navigation"
import {
  useCandidatoSearch,
  type CandidatoEncontrado,
} from "@/hooks/use-candidato-search"
import { fmtCompact, fmtInt, partyColor } from "@/lib/format"
import { normalizeSearch, toSearch, type DashboardParams } from "@/lib/params"

const LISTBOX_ID = "sugestoes-candidatos"

/** Destaca o trecho do nome que bate com o termo, ignorando acentos. */
function Highlight({ text, termo }: { text: string; termo: string }) {
  const alvo = normalizeSearch(termo.trim())
  if (!alvo) return <>{text}</>
  const index = normalizeSearch(text).indexOf(alvo)
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-amber-400/30 px-0.5 text-inherit">
        {text.slice(index, index + alvo.length)}
      </mark>
      {text.slice(index + alvo.length)}
    </>
  )
}

export function CandidateSearch({ params }: { params: DashboardParams }) {
  const { navigate } = useDashboardNav()
  const [text, setText] = React.useState(params.q ?? "")
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { results, total, status } = useCandidatoSearch(text, {
    turno: params.turno,
    cargo: params.cargo,
  })

  const termo = text.trim()
  const podeFiltrar = termo.length > 0
  // Opções navegáveis: candidatos + a ação "filtrar o ranking".
  const optionCount = results.length + (podeFiltrar ? 1 : 0)
  const showPopup = open && termo.length >= 2

  React.useEffect(() => {
    setActive(-1)
  }, [termo])

  function escolherCandidato(c: CandidatoEncontrado) {
    // Candidato estadual: troca para a UF dele se já havia uma UF escolhida.
    // Presidente: mantém o recorte atual.
    const ufCandidato = c.sg_ue === "BR" ? undefined : c.sg_ue
    const uf = ufCandidato ? (params.uf ? ufCandidato : undefined) : params.uf
    navigate(
      toSearch(params, {
        cargo: c.cd_cargo,
        uf,
        mun: undefined,
        pais: undefined,
        cand: c.sq_candidato,
        q: undefined,
        page: undefined,
      })
    )
    setText("")
    setOpen(false)
    scrollToIfHidden("detalhe")
  }

  function filtrarRanking() {
    navigate(
      toSearch(params, {
        q: termo || undefined,
        cand: undefined,
        page: undefined,
      })
    )
    setOpen(false)
  }

  function limpar() {
    setText("")
    setOpen(false)
    if (params.q) {
      navigate(toSearch(params, { q: undefined, page: undefined }))
    }
    inputRef.current?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      if (optionCount) setActive((i) => (i + 1) % optionCount)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setOpen(true)
      if (optionCount) setActive((i) => (i <= 0 ? optionCount - 1 : i - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const escolhido = active >= 0 ? results[active] : undefined
      if (escolhido) escolherCandidato(escolhido)
      else if (podeFiltrar || params.q) filtrarRanking()
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault()
        setOpen(false)
      } else if (text) {
        event.preventDefault()
        limpar()
      }
    }
  }

  const activeId = active >= 0 ? `${LISTBOX_ID}-${active}` : undefined
  const statusText =
    termo.length < 2
      ? ""
      : status === "loading" && !results.length
        ? "Buscando candidatos"
        : status === "error"
          ? "Não foi possível buscar agora"
          : `${fmtInt(total)} candidato(s) encontrado(s)`

  return (
    <div className="relative min-w-0 flex-1 basis-64">
      <label
        htmlFor="filtro-busca"
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Pesquisar candidato
      </label>
      <div className="relative">
        {status === "loading" && termo.length >= 2 ? (
          <LoaderCircleIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        ) : (
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          ref={inputRef}
          id="filtro-busca"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPopup}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={showPopup ? activeId : undefined}
          aria-describedby="filtro-busca-ajuda"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Nome, número ou partido"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-10 pr-10 pl-9 text-sm md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpar pesquisa"
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2 cursor-pointer"
            onMouseDown={(event) => event.preventDefault()}
            onClick={limpar}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <p id="filtro-busca-ajuda" className="sr-only">
        Use as setas para escolher um candidato e Enter para abrir. Enter sem
        escolher filtra o ranking.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {showPopup ? statusText : ""}
      </p>

      {showPopup && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 animate-in overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
            <span aria-hidden>{statusText}</span>
            {results.length > 0 && total > results.length && (
              <span aria-hidden>mostrando {results.length}</span>
            )}
          </div>
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Candidatos encontrados"
            className="max-h-80 overflow-y-auto p-1"
          >
            {results.map((c, index) => (
              <li
                key={c.sq_candidato}
                id={`${LISTBOX_ID}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => escolherCandidato(c)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors duration-100",
                  index === active && "bg-accent text-accent-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: partyColor(c.sg_partido) }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      <Highlight text={c.nm_urna_candidato} termo={termo} />
                    </span>
                    {!normalizeSearch(c.nm_urna_candidato).includes(
                      normalizeSearch(termo)
                    ) &&
                      normalizeSearch(c.nm_candidato).includes(
                        normalizeSearch(termo)
                      ) && (
                        <span className="block truncate text-xs">
                          <Highlight text={c.nm_candidato} termo={termo} />
                        </span>
                      )}
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.nr_candidato} · {c.sg_partido} · {c.ds_cargo}
                      {c.sg_ue !== "BR" && ` · ${c.sg_ue}`}
                      {c.cd_cargo !== params.cargo && " · outro cargo"}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xs tabular-nums">
                    {fmtCompact(c.votos)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {c.situacao.charAt(0) + c.situacao.slice(1).toLowerCase()}
                  </span>
                </span>
              </li>
            ))}

            {status === "success" && results.length === 0 && (
              <li
                role="presentation"
                className="px-3 py-4 text-center text-sm text-muted-foreground"
              >
                Nenhum candidato com “{termo}”. Tente só o sobrenome, o número
                de urna (ex.: 13) ou a sigla do partido.
              </li>
            )}
            {status === "error" && (
              <li
                role="presentation"
                className="px-3 py-4 text-center text-sm text-destructive"
              >
                A pesquisa falhou. Confira se o banco está no ar e tente de
                novo.
              </li>
            )}

            {podeFiltrar && (
              <li
                id={`${LISTBOX_ID}-${results.length}`}
                role="option"
                aria-selected={active === results.length}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(results.length)}
                onClick={filtrarRanking}
                className={cn(
                  "mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border-t px-2 text-sm text-muted-foreground transition-colors duration-100",
                  active === results.length &&
                    "bg-accent text-accent-foreground"
                )}
              >
                <FilterIcon aria-hidden className="size-4" />
                Filtrar o ranking por “{termo}”
                <kbd className="ml-auto rounded border px-1.5 font-mono text-[11px]">
                  Enter
                </kbd>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
