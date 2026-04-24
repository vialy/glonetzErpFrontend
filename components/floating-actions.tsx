"use client"

import { PlusSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/hooks/use-locale"
import { useAuth } from "@/hooks/use-auth"
import { useRouteLoader } from "@/components/route-loader"

export function FloatingActions() {
  const { t } = useLocale()
  const { role } = useAuth()
  const router = useRouter()
  const { startLoading } = useRouteLoader()

  if (role === "accountant" || role === "student") {
    return null
  }

  if (role === "manager") {
    return (
      <div className="fixed bottom-4 right-4 z-40 hidden md:flex md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={() => {
            startLoading()
            router.push("/dashboard/manager/depenses/nouvelle")
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95"
        >
          <PlusSquare className="size-4" />
          <span className="hidden sm:inline">{t("new_expense")}</span>
        </button>
      </div>
    )
  }

  return null
}
