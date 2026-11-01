# Eleições 2026 · Dashboard

Dashboard com os resultados do 1º turno (todos os cargos) e do 2º turno
(Presidente), em `apps/web`.

## Dados

A dashboard lê o Postgres local `eleicoes_2026`. Na pasta acima deste
repositório, carregue os dados na ordem:

```bash
psql -d eleicoes_2026 -f carga_votacao_candidato_munzona.sql
psql -d eleicoes_2026 -f carga_votacao_secao.sql
psql -d eleicoes_2026 -f carga_dashboard.sql   # também roda carga_exterior.sql
```

`carga_exterior.sql` associa cada cidade do exterior a um país e uma região,
informação que não vem nos arquivos do TSE.

Por padrão a conexão usa o socket `/tmp` e o banco `eleicoes_2026`. Para usar
outro banco, defina `DATABASE_URL` em `apps/web/.env.local`.

## shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
