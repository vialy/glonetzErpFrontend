"use client"

import { useCallback, useState } from "react"
import type { ActionFeedbackStatus } from "@/components/admin/action-feedback-overlay"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorMessage } from "@/lib/api-error"

type FeedbackState = {
  open: boolean
  status: ActionFeedbackStatus
  message: string
}

const idleState: FeedbackState = {
  open: false,
  status: "loading",
  message: "",
}

export function useActionFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>(idleState)

  const close = useCallback(() => {
    setFeedback((current) => ({ ...current, open: false }))
  }, [])

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      messages: {
        loading: string
        success: string | ((result: T) => string)
        error: string
      },
    ): Promise<{ ok: true; result: T } | { ok: false; error: unknown }> => {
      setFeedback({ open: true, status: "loading", message: messages.loading })
      try {
        const result = await action()
        const successMessage =
          typeof messages.success === "function" ? messages.success(result) : messages.success
        setFeedback({ open: true, status: "success", message: successMessage })
        toast({ title: successMessage })
        return { ok: true, result }
      } catch (error) {
        const errorMessage = getApiErrorMessage(error, messages.error)
        setFeedback({ open: true, status: "error", message: errorMessage })
        toast({ title: errorMessage, variant: "destructive" })
        return { ok: false, error }
      }
    },
    [],
  )

  return { feedback, close, run }
}
