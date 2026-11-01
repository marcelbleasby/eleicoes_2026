import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando dashboard"
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-16 w-full max-w-xl" />
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
