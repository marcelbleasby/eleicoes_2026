import { Pool, type QueryResultRow } from "pg"

const globalForPg = globalThis as unknown as { pgPool?: Pool }

const pool =
  globalForPg.pgPool ??
  new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : { host: "/tmp", database: "eleicoes_2026" }
  )

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params)
  return result.rows
}
