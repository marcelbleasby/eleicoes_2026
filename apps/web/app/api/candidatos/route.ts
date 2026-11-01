import type { NextRequest } from "next/server"
import { CARGOS, normalizeSearch } from "@/lib/params"
import { searchCandidatos } from "@/lib/queries"

const MIN_TERMO = 2

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const termo = normalizeSearch(params.get("q") ?? "")
    .trim()
    .slice(0, 80)

  if (termo.length < MIN_TERMO) {
    return Response.json({ results: [], total: 0 })
  }

  const turno = params.get("turno") === "2" ? 2 : 1
  const cargoNum = Number(params.get("cargo"))
  const cargo = CARGOS.some((c) => c.id === cargoNum) ? cargoNum : undefined
  const limitNum = Number(params.get("limit"))
  const limit = Number.isInteger(limitNum)
    ? Math.min(Math.max(limitNum, 1), 20)
    : 8

  const rows = await searchCandidatos(turno, termo, { cargo, limit })

  return Response.json({
    results: rows.map(({ total: _total, ...row }) => row),
    total: rows[0]?.total ?? 0,
  })
}
