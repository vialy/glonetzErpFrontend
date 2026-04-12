"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"
import { FloatingActions } from "@/components/floating-actions"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { RouteLoaderProvider } from "@/components/route-loader"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useLocale } from "@/hooks/use-locale"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, logout, role } = useAuth()
  const { t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/")
    } else {
      setReady(true)
    }
  }, [isAuthenticated, router])

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  if (!ready) return null

  return (
    <RouteLoaderProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col h-full min-h-0 overflow-hidden">
          <SidebarNav onLogout={logout} role={role} />
        </aside>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SheetTitle className="sr-only">{t("nav_menu")}</SheetTitle>
            <SidebarNav onLogout={logout} role={role} />
          </SheetContent>
        </Sheet>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <TopBar onMenuToggle={handleMenuToggle} />
          <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <MobileBottomNav role={role} />
        <FloatingActions />
      </div>
    </RouteLoaderProvider>
  )
}
