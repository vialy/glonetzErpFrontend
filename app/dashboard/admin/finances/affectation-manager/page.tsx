"use client"

import { useState } from "react"
import { HandCoins, TrendingDown } from "lucide-react"
import { formatFcfa } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { useFinanceContext } from "../finance-context"

export default function ManagerAllocationPage() {
  const { wallets, managers, requestManagerTransfer, addExtraExpense } = useFinanceContext()
  const [allocationWalletId, setAllocationWalletId] = useState(wallets[0]?.id ?? "")
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "")
  const [allocationLabel, setAllocationLabel] = useState("")
  const [allocationAmount, setAllocationAmount] = useState("")
  const [extraWalletId, setExtraWalletId] = useState(wallets[0]?.id ?? "")
  const [extraLabel, setExtraLabel] = useState("")
  const [extraAmount, setExtraAmount] = useState("")
  const allocationWallet = wallets.find((wallet) => wallet.id === allocationWalletId)
  const extraWallet = wallets.find((wallet) => wallet.id === extraWalletId)

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-3 text-primary-foreground">
          <p className="text-sm font-semibold">Affecter de l'argent au manager</p>
          <p className="mt-0.5 text-xs text-primary-foreground/85">Selectionne un portefeuille source puis initie le paiement vers le numero du manager.</p>
        </div>
        <div className="p-3 sm:p-4">
          <div className="mb-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Solde disponible</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatFcfa(allocationWallet?.currentBalance ?? 0)}</p>
          </div>
          <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Manager</label>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-muted-foreground">Portefeuille source</label>
          <select value={allocationWalletId} onChange={(e) => setAllocationWalletId(e.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({formatFcfa(wallet.currentBalance)})
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-muted-foreground">Motif</label>
          <input value={allocationLabel} onChange={(e) => setAllocationLabel(e.target.value)} placeholder="Motif allocation manager" className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <label className="block text-xs font-medium text-muted-foreground">Montant</label>
          <input value={allocationAmount} onChange={(e) => setAllocationAmount(e.target.value)} type="number" placeholder="Montant FCFA" className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button
            onClick={() => {
              const result = requestManagerTransfer(allocationWalletId, managerId, allocationLabel, Number(allocationAmount))
              if (!result.ok) {
                toast({ title: "Affectation refusee", description: result.reason, variant: "destructive" })
                return
              }
              setAllocationLabel("")
              setAllocationAmount("")
              toast({
                title: "Paiement initie",
                description: "Demande creee en attente de confirmation operateur. Va dans 'Paiements managers' pour suivre le statut.",
              })
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <HandCoins className="size-4" /> Affecter au manager
          </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-white">
          <p className="text-sm font-semibold">Depense extraordinaire</p>
          <p className="mt-0.5 text-xs text-white/90">Enregistre une charge exceptionnelle depuis un portefeuille source.</p>
        </div>
        <div className="p-3 sm:p-4">
          <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Solde disponible</p>
            <p className="mt-0.5 font-semibold text-foreground">{formatFcfa(extraWallet?.currentBalance ?? 0)}</p>
          </div>
          <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Portefeuille source</label>
          <select value={extraWalletId} onChange={(e) => setExtraWalletId(e.target.value)} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({formatFcfa(wallet.currentBalance)})
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-muted-foreground">Motif</label>
          <input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder="Motif depense extraordinaire" className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <label className="block text-xs font-medium text-muted-foreground">Montant</label>
          <input value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} type="number" placeholder="Montant FCFA" className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button
            onClick={() => {
              const result = addExtraExpense(extraWalletId, extraLabel, Number(extraAmount))
              if (!result.ok) {
                toast({ title: "Operation refusee", description: result.reason, variant: "destructive" })
                return
              }
              setExtraLabel("")
              setExtraAmount("")
              toast({ title: "Depense enregistree", description: "Depense extraordinaire ajoutee." })
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <TrendingDown className="size-4" /> Enregistrer depense
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
