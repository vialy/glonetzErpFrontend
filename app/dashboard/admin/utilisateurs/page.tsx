"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { adminUsers, type AdminUserItem } from "@/services/admin-mock.service"
import { toast } from "@/components/ui/use-toast"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminUsersPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("student")
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null)

  return (
    <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
      <AdminPageHeader
        title="Utilisateurs & roles"
        subtitle="Gestion des comptes admin, manager, comptable et apprenants."
        gradientClassName="from-slate-700 to-slate-900"
      />
      <div className="mt-4 flex justify-end">
        <button onClick={() => setShowCreate((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><UserPlus className="size-3.5" /> Ajouter utilisateur</button>
      </div>
      {showCreate ? (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Nouveau compte utilisateur</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Nom complet" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Telephone" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="accountant">accountant</option>
              <option value="student">student</option>
            </select>
          </div>
          <button
            onClick={() => {
              if (!fullName || !phone) {
                toast({
                  title: "Champs manquants",
                  description: "Nom et telephone sont obligatoires.",
                  variant: "destructive",
                })
                return
              }
              toast({
                title: "Compte cree",
                description: `${fullName} (${role}) a ete ajoute en mode front-end.`,
              })
              setFullName("")
              setPhone("")
              setRole("student")
            }}
            className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Enregistrer
          </button>
        </div>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Telephone</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{u.status}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => toast({ title: "Edition utilisateur", description: `Edition de ${u.fullName} ouverte (placeholder).` })} className="rounded-md border px-2 py-1 text-xs">Modifier</button><button onClick={() => setResetTarget(u)} className="rounded-md border px-2 py-1 text-xs">Reset PIN</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {adminUsers.length === 0 ? (
          <AdminEmptyState title="Aucun utilisateur" description="Ajoute un premier compte pour demarrer." />
        ) : null}
      </div>
      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reinitialiser le PIN ?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? `Voulez-vous vraiment reinitialiser le PIN de ${resetTarget.fullName} ?`
                : "Voulez-vous vraiment reinitialiser ce PIN ?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!resetTarget) return
                toast({
                  title: "PIN reinitialise",
                  description: `Nouveau PIN envoye pour ${resetTarget.fullName} (simulation).`,
                })
                setResetTarget(null)
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

