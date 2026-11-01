"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"

type NavContext = {
  pending: boolean
  navigate: (search: string) => void
}

const DashboardNavContext = React.createContext<NavContext | null>(null)

export function useDashboardNav() {
  const context = React.useContext(DashboardNavContext)
  if (!context) {
    throw new Error("useDashboardNav must be used within DashboardNavProvider")
  }
  return context
}

export function DashboardNavProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = React.useTransition()

  const navigate = React.useCallback(
    (search: string) => {
      startTransition(() => {
        router.replace(`${pathname}${search}`, { scroll: false })
      })
    },
    [pathname, router]
  )

  const value = React.useMemo(
    () => ({ pending, navigate }),
    [pending, navigate]
  )

  return (
    <DashboardNavContext.Provider value={value}>
      {children}
    </DashboardNavContext.Provider>
  )
}

/** Escurece o conteúdo enquanto os novos dados carregam, sem esconder o que já está na tela. */
export function PendingArea({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { pending } = useDashboardNav()
  return (
    <div
      aria-busy={pending}
      className={cn(
        "transition-opacity duration-200 motion-reduce:transition-none",
        pending && "opacity-60",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PendingIndicator() {
  const { pending } = useDashboardNav()
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {pending ? "Carregando dados" : ""}
    </span>
  )
}

/** Rola até o elemento só se ele estiver fora da área visível (ex.: painel abaixo da tabela no celular). */
export function scrollToIfHidden(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const rect = target.getBoundingClientRect()
  if (rect.top >= 0 && rect.top <= window.innerHeight * 0.6) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  target.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  })
}

/** Link que troca só os parâmetros da URL, mantendo a rolagem e o estado de carregamento. */
export function NavLink({
  href,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useDashboardNav()
  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button !== 0
        ) {
          return
        }
        event.preventDefault()
        navigate(href)
        const targetId = event.currentTarget.dataset.scrollTo
        if (targetId) scrollToIfHidden(targetId)
      }}
      {...props}
    />
  )
}
