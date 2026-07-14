"use client"

import { useCallback, useState } from "react"
import { ManagerPaymentsView } from "@/components/paiements/manager-payments-view"
import { DataLoadError } from "@/components/data-load-error"
import { useAdminPaymentsQuery } from "@/hooks/use-admin-payments"

export default function ManagerPaiementsPage() {
  const { payments, loading, error, refresh } = useAdminPaymentsQuery()
  const [retrying, setRetrying] = useState(false)
  const handleRetry = useCallback(async () => {
    setRetrying(true)
    await refresh()
    setRetrying(false)
  }, [refresh])

  if (error && payments.length === 0) {
    return <DataLoadError fullScreen onRetry={handleRetry} retrying={retrying} />
  }

  return <ManagerPaymentsView payments={payments} loading={loading} />
}
