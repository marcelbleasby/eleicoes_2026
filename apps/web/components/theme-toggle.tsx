"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@workspace/ui/components/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="size-10 cursor-pointer"
      aria-label="Alternar entre tema claro e escuro"
      title="Alternar tema (tecla D)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon aria-hidden className="hidden size-4 dark:block" />
      <MoonIcon aria-hidden className="size-4 dark:hidden" />
    </Button>
  )
}
