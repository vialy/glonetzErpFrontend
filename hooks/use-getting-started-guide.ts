"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import {
  getGuideStepsForRole,
  getStoredCompletedIds,
  isGuideStepVisited,
  saveCompletedIds,
  resetGuideProgress,
  type GuideStep,
} from "@/lib/getting-started-guide"
import type { UserRole } from "@/types"

export function useGettingStartedGuide(role: UserRole | null) {
  const pathname = usePathname()
  const steps = useMemo(() => getGuideStepsForRole(role), [role])
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const syncFromStorage = useCallback(() => {
    if (!role) {
      setCompletedIds([])
      return
    }
    setCompletedIds(getStoredCompletedIds(role))
  }, [role])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener("getting-started-updated", syncFromStorage)
    return () => window.removeEventListener("getting-started-updated", syncFromStorage)
  }, [syncFromStorage])

  useEffect(() => {
    if (!role || steps.length === 0) return
    const visited = steps.filter((step) => isGuideStepVisited(pathname, step.href)).map((s) => s.id)
    if (visited.length === 0) return

    setCompletedIds((prev) => {
      const merged = new Set([...prev, ...visited])
      const next = [...merged]
      saveCompletedIds(role, next)
      return next
    })
  }, [pathname, role, steps])

  const completedCount = useMemo(
    () => steps.filter((s) => completedIds.includes(s.id)).length,
    [steps, completedIds],
  )

  const total = steps.length
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const isComplete = total > 0 && completedCount >= total

  const isStepDone = useCallback((stepId: string) => completedIds.includes(stepId), [completedIds])

  const currentStep = useMemo(
    () => steps.find((s) => isGuideStepVisited(pathname, s.href)),
    [steps, pathname],
  )

  function reset() {
    if (!role) return
    resetGuideProgress(role)
    setCompletedIds([])
  }

  return {
    steps,
    completedIds,
    completedCount,
    total,
    progressPercent,
    isComplete,
    isStepDone,
    currentStep,
    reset,
  }
}

export type GettingStartedGuideState = ReturnType<typeof useGettingStartedGuide>
