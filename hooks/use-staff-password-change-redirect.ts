"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export const STAFF_PASSWORD_REDIRECT_SECONDS = 2

export function useStaffPasswordChangeRedirect() {
  const { logout } = useAuth()
  const [successVisible, setSuccessVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(STAFF_PASSWORD_REDIRECT_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRedirectCountdown = useCallback(() => {
    cancel()
    setSuccessVisible(true)
    setSecondsLeft(STAFF_PASSWORD_REDIRECT_SECONDS)

    let remaining = STAFF_PASSWORD_REDIRECT_SECONDS
    timerRef.current = setInterval(() => {
      remaining -= 1
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        cancel()
        logout("/login?passwordChanged=1")
      }
    }, 1000)
  }, [cancel, logout])

  useEffect(() => () => cancel(), [cancel])

  return { successVisible, secondsLeft, startRedirectCountdown, cancel }
}
