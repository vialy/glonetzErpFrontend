"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { adminExpenses, adminUsers } from "@/services/admin-mock.service"
import { useAdminClasses } from "@/hooks/use-admin-classes"
import { ManagerWalletService } from "@/domains/manager-wallet"
import {
  computePeriodRange,
  defaultManagerPeriodFilter,
  isIsoDateInPeriod,
  type ManagerPeriodFilterValue,
} from "@/lib/manager-period-range"

export type WalletType = "tuition" | "other"
export type FinanceOperationType = "inflow" | "manager_allocation" | "extra_expense"
export type ManagerTransferStatus = "pending" | "success" | "failed"

export type TreasuryWallet = {
  id: string
  name: string
  description: string
  type: WalletType
  currentBalance: number
}

export type FinanceOperation = {
  id: string
  walletId: string
  type: FinanceOperationType
  amount: number
  label: string
  createdAt: string
  managerId?: string
  managerName?: string
  managerPhone?: string
  transferStatus?: ManagerTransferStatus
  externalTransactionId?: string
  processedAt?: string
  failureReason?: string
}

type FinanceContextValue = {
  wallets: TreasuryWallet[]
  operations: FinanceOperation[]
  managers: { id: string; fullName: string }[]
  managerAppBalances: Record<string, number>
  activeWalletId: string
  setActiveWalletId: (id: string) => void
  periodFilter: ManagerPeriodFilterValue
  setPeriodFilter: (next: ManagerPeriodFilterValue) => void
  periodFilterApplied: boolean
  filteredOperationCount: number
  totalBalance: number
  inflowTotal: number
  managerOut: number
  extraOut: number
  managerRemainingReal: number
  consolidatedTheoretical: number
  consolidatedRealRemaining: number
  createWallet: (name: string, description: string) => { ok: boolean; reason?: string }
  addBusinessInflow: (walletId: string, label: string, amount: number) => { ok: boolean; reason?: string }
  requestManagerTransfer: (walletId: string, managerId: string, label: string, amount: number) => { ok: boolean; reason?: string; operationId?: string }
  settleManagerTransfer: (operationId: string, payload: { status: ManagerTransferStatus; externalTransactionId?: string; failureReason?: string }) => { ok: boolean; reason?: string }
  validateFailedTransferAfterCheck: (operationId: string, payload: { verificationNote: string; externalTransactionId?: string }) => { ok: boolean; reason?: string }
  addExtraExpense: (walletId: string, label: string, amount: number) => { ok: boolean; reason?: string }
  deleteWallet: (walletId: string) => { ok: boolean; reason?: string }
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function useFinanceContext() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error("useFinanceContext must be used within FinanceProvider")
  return ctx
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const adminClassesList = useAdminClasses()
  const tuitionIn = useMemo(() => adminClassesList.reduce((sum, c) => sum + c.totalPaid, 0), [adminClassesList])
  const managerOutSeed = useMemo(() => adminExpenses.filter((e) => e.type === "manager").reduce((sum, e) => sum + e.amount, 0), [])
  const extraOutSeed = useMemo(() => adminExpenses.filter((e) => e.type === "extra").reduce((sum, e) => sum + e.amount, 0), [])

  const [wallets, setWallets] = useState<TreasuryWallet[]>([
    {
      id: "w-tuition",
      name: "Portefeuille pensions apprenants",
      description: "Receptions des paiements de scolarite des apprenants.",
      type: "tuition",
      currentBalance: tuitionIn - managerOutSeed - extraOutSeed,
    },
    {
      id: "w-other",
      name: "Portefeuille autres business",
      description: "Entrees additionnelles hors paiements apprenants.",
      type: "other",
      currentBalance: 900000,
    },
  ])
  const [operations, setOperations] = useState<FinanceOperation[]>([
    { id: "fo-1", walletId: "w-other", type: "inflow", amount: 900000, label: "Vente annexe campus", createdAt: "2026-03-10" },
  ])
  const [activeWalletId, setActiveWalletId] = useState("w-tuition")
  const [periodFilter, setPeriodFilter] = useState<ManagerPeriodFilterValue>(defaultManagerPeriodFilter)
  const [managerAppBalances, setManagerAppBalances] = useState<Record<string, number>>({})
  const [managerWalletTick, setManagerWalletTick] = useState(0)
  const managers = useMemo(
    () => adminUsers.filter((u) => u.role === "manager").map((u) => ({ id: u.id, fullName: u.fullName })),
    []
  )

  useEffect(() => {
    const onManagerWalletUpdated = () => setManagerWalletTick((prev) => prev + 1)
    window.addEventListener("manager-wallet-updated", onManagerWalletUpdated)
    return () => window.removeEventListener("manager-wallet-updated", onManagerWalletUpdated)
  }, [])

  const periodRange = useMemo(() => computePeriodRange(periodFilter), [periodFilter])
  const periodFilterApplied = periodFilter.preset !== "all" && periodRange !== null
  const filteredOperations = useMemo(
    () => operations.filter((o) => isIsoDateInPeriod(o.createdAt, periodRange)),
    [operations, periodRange]
  )
  const filteredOperationCount = filteredOperations.length

  const totalBalance = useMemo(() => wallets.reduce((sum, w) => sum + w.currentBalance, 0), [wallets])
  const inflowTotalGlobal = useMemo(
    () => tuitionIn + operations.filter((o) => o.type === "inflow").reduce((sum, o) => sum + o.amount, 0),
    [operations, tuitionIn]
  )
  const managerOut = useMemo(
    () =>
      managerOutSeed +
      operations
        .filter((o) => o.type === "manager_allocation" && o.transferStatus === "success")
        .reduce((sum, o) => sum + o.amount, 0),
    [operations, managerOutSeed]
  )
  const extraOut = useMemo(
    () => extraOutSeed + operations.filter((o) => o.type === "extra_expense").reduce((sum, o) => sum + o.amount, 0),
    [operations, extraOutSeed]
  )
  const managerBudgetSummary = useMemo(() => ManagerWalletService.getSummary(), [managerWalletTick])
  const filteredManagerAllocations = useMemo(
    () => ManagerWalletService.getAllocations().filter((a) => isIsoDateInPeriod(a.allocatedAt, periodRange)),
    [managerWalletTick, periodRange]
  )
  const filteredManagerExpenses = useMemo(
    () => ManagerWalletService.getExpenses().filter((e) => isIsoDateInPeriod(e.spentAt, periodRange)),
    [managerWalletTick, periodRange]
  )

  const periodInflow = useMemo(
    () => filteredOperations.filter((o) => o.type === "inflow").reduce((sum, o) => sum + o.amount, 0),
    [filteredOperations]
  )
  const periodManagerOut = useMemo(
    () =>
      filteredOperations
        .filter((o) => o.type === "manager_allocation" && o.transferStatus === "success")
        .reduce((sum, o) => sum + o.amount, 0),
    [filteredOperations]
  )
  const periodExtraOut = useMemo(
    () => filteredOperations.filter((o) => o.type === "extra_expense").reduce((sum, o) => sum + o.amount, 0),
    [filteredOperations]
  )
  const periodManagerRemaining = useMemo(
    () =>
      filteredManagerAllocations.reduce((sum, a) => sum + a.amount, 0) -
      filteredManagerExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredManagerAllocations, filteredManagerExpenses]
  )

  const inflowTotal = periodFilterApplied ? periodInflow : inflowTotalGlobal
  const managerOutDisplay = periodFilterApplied ? periodManagerOut : managerOut
  const extraOutDisplay = periodFilterApplied ? periodExtraOut : extraOut
  const managerRemainingReal = periodFilterApplied ? periodManagerRemaining : managerBudgetSummary.remaining
  // Modele metier demande:
  // - theorique = ce qui reste dans les wallets admin apres allocations managers
  // - reel = theorique + reste non depense cote manager
  const consolidatedTheoretical = periodFilterApplied ? periodInflow - periodManagerOut - periodExtraOut : totalBalance
  const consolidatedRealRemaining = consolidatedTheoretical + managerRemainingReal

  function registerManagerAllocationInWallet(amount: number, label: string) {
    try {
      ManagerWalletService.registerAdminAllocation({ amount, note: label })
      setManagerWalletTick((prev) => prev + 1)
    } catch {
      // Ne pas bloquer le flux admin si la synchronisation manager echoue localement.
    }
  }

  function pushOperation(operation: FinanceOperation) {
    setOperations((prev) => [...prev, operation])
    setWallets((prev) =>
      prev.map((w) =>
        w.id === operation.walletId
          ? { ...w, currentBalance: operation.type === "inflow" ? w.currentBalance + operation.amount : w.currentBalance - operation.amount }
          : w
      )
    )
  }

  function createWallet(name: string, description: string) {
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    if (!trimmedName) return { ok: false, reason: "Nom requis" }
    if (!trimmedDescription) return { ok: false, reason: "Description requise" }
    const id = `w-${Date.now()}`
    setWallets((prev) => [...prev, { id, name: trimmedName, description: trimmedDescription, type: "other", currentBalance: 0 }])
    setActiveWalletId(id)
    return { ok: true }
  }

  function addBusinessInflow(walletId: string, label: string, amount: number) {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return { ok: false, reason: "Portefeuille introuvable" }
    if (!label.trim()) return { ok: false, reason: "Libelle requis" }
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Montant invalide" }
    pushOperation({ id: `fo-${Date.now()}`, walletId, type: "inflow", amount, label: label.trim(), createdAt: new Date().toISOString().slice(0, 10) })
    return { ok: true }
  }

  function requestManagerTransfer(walletId: string, managerId: string, label: string, amount: number) {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return { ok: false, reason: "Portefeuille introuvable" }
    const manager = managers.find((m) => m.id === managerId)
    if (!manager) return { ok: false, reason: "Manager requis" }
    if (!label.trim()) return { ok: false, reason: "Motif requis" }
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Montant invalide" }
    if (amount > wallet.currentBalance) return { ok: false, reason: "Solde insuffisant" }
    const managerUser = adminUsers.find((u) => u.id === managerId)
    const operationId = `fo-${Date.now()}`
    setOperations((prev) => [
      ...prev,
      {
      id: operationId,
      walletId,
      type: "manager_allocation",
      amount,
      label: label.trim(),
      managerId: manager.id,
      managerName: manager.fullName,
      managerPhone: managerUser?.phone,
      transferStatus: "pending",
      createdAt: new Date().toISOString().slice(0, 10),
      },
    ])
    return { ok: true, operationId }
  }

  function settleManagerTransfer(
    operationId: string,
    payload: { status: ManagerTransferStatus; externalTransactionId?: string; failureReason?: string }
  ) {
    const op = operations.find((item) => item.id === operationId)
    if (!op) return { ok: false, reason: "Operation introuvable" }
    if (op.type !== "manager_allocation") return { ok: false, reason: "Operation non compatible" }
    if (op.transferStatus !== "pending") return { ok: false, reason: "Operation deja traitee" }
    if (payload.status === "failed" && !payload.failureReason?.trim()) return { ok: false, reason: "Motif d'echec requis" }

    setOperations((prev) =>
      prev.map((item) =>
        item.id === operationId
          ? {
              ...item,
              transferStatus: payload.status,
              externalTransactionId: payload.externalTransactionId?.trim() || item.externalTransactionId,
              failureReason: payload.status === "failed" ? payload.failureReason?.trim() : undefined,
              processedAt: new Date().toISOString().slice(0, 10),
            }
          : item
      )
    )

    if (payload.status === "success") {
      setWallets((prev) =>
        prev.map((wallet) =>
          wallet.id === op.walletId ? { ...wallet, currentBalance: wallet.currentBalance - op.amount } : wallet
        )
      )
      if (op.managerId) {
        setManagerAppBalances((prev) => ({ ...prev, [op.managerId!]: (prev[op.managerId!] ?? 0) + op.amount }))
      }
      registerManagerAllocationInWallet(op.amount, op.label)
    }

    return { ok: true }
  }

  function validateFailedTransferAfterCheck(
    operationId: string,
    payload: { verificationNote: string; externalTransactionId?: string }
  ) {
    const op = operations.find((item) => item.id === operationId)
    if (!op) return { ok: false, reason: "Operation introuvable" }
    if (op.type !== "manager_allocation") return { ok: false, reason: "Operation non compatible" }
    if (op.transferStatus !== "failed") return { ok: false, reason: "Validation manuelle reservee aux echecs" }
    if (!payload.verificationNote.trim()) return { ok: false, reason: "Motif de verification requis" }

    setOperations((prev) =>
      prev.map((item) =>
        item.id === operationId
          ? {
              ...item,
              transferStatus: "success",
              processedAt: new Date().toISOString().slice(0, 10),
              externalTransactionId: payload.externalTransactionId?.trim() || item.externalTransactionId,
              failureReason: `Validation manuelle admin: ${payload.verificationNote.trim()}`,
            }
          : item
      )
    )

    setWallets((prev) =>
      prev.map((wallet) =>
        wallet.id === op.walletId ? { ...wallet, currentBalance: wallet.currentBalance - op.amount } : wallet
      )
    )
    if (op.managerId) {
      setManagerAppBalances((prev) => ({ ...prev, [op.managerId!]: (prev[op.managerId!] ?? 0) + op.amount }))
    }
    registerManagerAllocationInWallet(op.amount, op.label)
    return { ok: true }
  }

  function addExtraExpense(walletId: string, label: string, amount: number) {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return { ok: false, reason: "Portefeuille introuvable" }
    if (!label.trim()) return { ok: false, reason: "Motif requis" }
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "Montant invalide" }
    if (amount > wallet.currentBalance) return { ok: false, reason: "Solde insuffisant" }
    pushOperation({ id: `fo-${Date.now()}`, walletId, type: "extra_expense", amount, label: label.trim(), createdAt: new Date().toISOString().slice(0, 10) })
    return { ok: true }
  }

  function deleteWallet(walletId: string) {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return { ok: false, reason: "Portefeuille introuvable" }
    if (wallet.type === "tuition") return { ok: false, reason: "Portefeuille principal non supprimable" }
    if (wallet.currentBalance > 0) return { ok: false, reason: "Vider le solde avant suppression" }
    if (operations.some((op) => op.walletId === walletId)) return { ok: false, reason: "Historique existant, suppression bloquee" }
    setWallets((prev) => prev.filter((w) => w.id !== walletId))
    if (activeWalletId === walletId) {
      const fallback = wallets.find((w) => w.id !== walletId)
      if (fallback) setActiveWalletId(fallback.id)
    }
    return { ok: true }
  }

  return (
    <FinanceContext.Provider
      value={{
        wallets,
        operations,
        managers,
        managerAppBalances,
        activeWalletId,
        setActiveWalletId,
        periodFilter,
        setPeriodFilter,
        periodFilterApplied,
        filteredOperationCount,
        totalBalance,
        inflowTotal,
        managerOut: managerOutDisplay,
        extraOut: extraOutDisplay,
        managerRemainingReal,
        consolidatedTheoretical,
        consolidatedRealRemaining,
        createWallet,
        addBusinessInflow,
        requestManagerTransfer,
        settleManagerTransfer,
        validateFailedTransferAfterCheck,
        addExtraExpense,
        deleteWallet,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}
