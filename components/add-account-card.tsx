"use client"

import { Plus } from "lucide-react"
import { useLocale } from "@/hooks/use-locale"

export function AddAccountCard() {
  const { t } = useLocale()

  return (
    <button className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-primary/60 transition-all hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-[0.98]">
      <Plus className="mb-2 size-8" />
      <span className="text-sm font-medium">{t("add_account")}</span>
    </button>
  )
}
