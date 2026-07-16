"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"
import { GlobalSearchCommand } from "@/components/global-search/global-search-command"
import { GettingStartedGuideSheet } from "@/components/getting-started/getting-started-guide-sheet"
import { useGettingStartedGuide } from "@/hooks/use-getting-started-guide"
import { FloatingActions } from "@/components/floating-actions"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { RouteLoaderProvider } from "@/components/route-loader"
import { WelcomeOverlay } from "@/components/welcome-overlay"
import { consumeWelcomePending } from "@/lib/welcome-session"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useLocale } from "@/hooks/use-locale"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, isAuthenticated, mustChangePin, logout, role, phone, email, fullName, refreshSession } = useAuth()
  const { t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const guide = useGettingStartedGuide(role)

  useEffect(() => {
    if (consumeWelcomePending()) {
      setShowWelcome(true)
    }
  }, [])

  useEffect(() => {
    if (status === "loading") return
    void refreshSession()
  }, [pathname, refreshSession, status])

  useEffect(() => {
    if (status === "loading") return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    if (role === "student") {
      logout()
      return
    }
    if (mustChangePin) {
      router.replace("/login")
    }
  }, [status, isAuthenticated, mustChangePin, role, router, logout])

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  if (status === "loading" || !isAuthenticated || mustChangePin || role === "student") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  const profileLabel = email ?? phone ?? undefined

  return (
    <RouteLoaderProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col h-full min-h-0 overflow-hidden">
          <SidebarNav onLogout={logout} role={role} />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SheetTitle className="sr-only">{t("nav_menu")}</SheetTitle>
            <SidebarNav
              onLogout={logout}
              onNavigate={() => setSidebarOpen(false)}
              role={role}
            />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <TopBar
            onMenuToggle={handleMenuToggle}
            role={role}
            phone={profileLabel}
            onLogout={logout}
            guideCompleted={guide.completedCount}
            guideTotal={guide.total}
            onGuideClick={() => setGuideOpen(true)}
            onSearchOpen={() => setSearchOpen(true)}
          />
          <GlobalSearchCommand
            open={searchOpen}
            onOpenChange={setSearchOpen}
            role={role}
            phone={phone}
          />
          <GettingStartedGuideSheet open={guideOpen} onOpenChange={setGuideOpen} guide={guide} />
          <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav role={role} />
        <FloatingActions />
      </div>
      {showWelcome ? (
        <WelcomeOverlay fullName={fullName} onDone={() => setShowWelcome(false)} />
      ) : null}
    </RouteLoaderProvider>
  )
}
