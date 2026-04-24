"use client"

import { Search, HelpCircle, Grid3X3, Settings, Menu, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLocale } from "@/hooks/use-locale"

interface TopBarProps {
  onMenuToggle: () => void
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { t } = useLocale()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3 shadow-sm md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-foreground"
          onClick={onMenuToggle}
          aria-label={t("open_menu")}
        >
          <Menu className="size-5" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("search_placeholder")}
            className="w-48 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none md:w-64"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground md:inline-block">
            /
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-2">
        <button className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 sm:flex">
          <span>{t("guide")}</span>
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
            8/11
          </span>
        </button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Grid3X3 className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="size-5" />
        </Button>

        <div className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Globe className="size-4" />
        </div>
      </div>
    </header>
  )
}
