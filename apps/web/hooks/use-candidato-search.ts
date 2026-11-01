"use client"

import * as React from "react"
import type { Turno } from "@/lib/params"
import type { CandidatoSugestao } from "@/lib/queries"

export type CandidatoEncontrado = Omit<CandidatoSugestao, "total">

type SearchResponse = { results: CandidatoEncontrado[]; total: number }

export type CandidatoSearchState = {
  /** Candidatos encontrados para o termo atual (mais relevantes primeiro). */
  results: CandidatoEncontrado[]
  /** Total de candidatos que batem com o termo, além dos listados. */
  total: number
  status: "idle" | "loading" | "success" | "error"
}

type Options = {
  turno: Turno
  /** Cargo que aparece primeiro na lista. */
  cargo?: number
  limit?: number
  minLength?: number
  debounceMs?: number
}

const IDLE: CandidatoSearchState = { results: [], total: 0, status: "idle" }
const CACHE_LIMIT = 50
const cache = new Map<string, SearchResponse>()

function remember(key: string, value: SearchResponse) {
  cache.set(key, value)
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

/**
 * Lista os candidatos que batem com o termo digitado, consultando /api/candidatos.
 * Espera o usuário parar de digitar, cancela buscas antigas e guarda as respostas recentes.
 */
export function useCandidatoSearch(
  termo: string,
  { turno, cargo, limit = 8, minLength = 2, debounceMs = 200 }: Options
): CandidatoSearchState {
  const trimmed = termo.trim()
  const ativo = trimmed.length >= minLength

  const url = React.useMemo(() => {
    if (!ativo) return null
    const search = new URLSearchParams({
      q: trimmed,
      turno: String(turno),
      limit: String(limit),
    })
    if (cargo) search.set("cargo", String(cargo))
    return `/api/candidatos?${search}`
  }, [ativo, trimmed, turno, cargo, limit])

  const [state, setState] = React.useState<{
    url: string | null
    value: CandidatoSearchState
  }>({ url: null, value: IDLE })

  React.useEffect(() => {
    if (!url) return

    const cached = cache.get(url)
    if (cached) {
      setState({ url, value: { ...cached, status: "success" } })
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState((prev) => ({
        url,
        value: { ...prev.value, status: "loading" },
      }))
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as SearchResponse
        remember(url, data)
        setState({ url, value: { ...data, status: "success" } })
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("Falha ao pesquisar candidatos", error)
        setState({ url, value: { results: [], total: 0, status: "error" } })
      }
    }, debounceMs)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [url, debounceMs])

  if (!url) return IDLE
  if (state.url !== url) {
    // Termo novo: mantém a lista anterior visível enquanto a busca não volta.
    return { ...state.value, status: "loading" }
  }
  return state.value
}
