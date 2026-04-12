"use client"

import { useEffect, useState } from "react"
import { Bell, KeyRound, LogOut, Shield, UserRound, WalletCards } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MobileBackButton } from "@/components/mobile-back-button"
import { Switch } from "@/components/ui/switch"
import { certificatesService, type TrainingCertificate } from "@/domains/certificates"
import { paymentsService, type StudentTuitionSummary } from "@/domains/payments"

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} F CFA`
}

export default function MonProfilPage() {
  const [summary, setSummary] = useState<StudentTuitionSummary>({
    studentName: "Etudiant Demo",
    className: "A1",
    totalTuition: 0,
    amountPaid: 0,
    remainingAmount: 0,
  })
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([])
  const [enrolledLevel, setEnrolledLevel] = useState("A2")

  useEffect(() => {
    const refresh = async () => {
      setSummary(await paymentsService.getSummary())
      setCertificates(await certificatesService.getForStudent())
      setEnrolledLevel(await certificatesService.getEnrolledLevel())
    }
    void refresh()
    window.addEventListener("student-payments-updated", refresh)
    return () => window.removeEventListener("student-payments-updated", refresh)
  }, [])

  const downloadCertificate = async (certificate: TrainingCertificate) => {
    if (certificate.status !== "disponible") return
    const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")

    const logoDataUrl = await fetch("/images/logo.png")
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("LOGO_READ_FAILED"))
            reader.readAsDataURL(blob)
          })
      )
      .catch(() => "")

    const issueDate = certificate.issuedAt
      ? new Date(certificate.issuedAt).toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("fr-FR")

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, pageWidth, pageHeight, "F")
    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(1.2)
    doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 4, 4, "S")

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 18, 16, 38, 13)
    }

    doc.setFont("helvetica", "bold")
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(26)
    doc.text("ATTESTATION DE FORMATION", pageWidth / 2, 46, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setTextColor(51, 65, 85)
    doc.setFontSize(13)
    doc.text("Le centre Glonetz certifie que", pageWidth / 2, 62, { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(22)
    doc.text(summary.studentName, pageWidth / 2, 78, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setTextColor(51, 65, 85)
    doc.setFontSize(13)
    doc.text(
      `a valide avec succes le niveau ${certificate.level} du programme de langue allemande.`,
      pageWidth / 2,
      92,
      { align: "center" }
    )

    doc.setFontSize(11)
    doc.text(`Date de delivrance: ${issueDate}`, 24, pageHeight - 30)
    doc.text(`Reference: ${certificate.id.toUpperCase()}`, pageWidth - 24, pageHeight - 30, { align: "right" })

    doc.setDrawColor(148, 163, 184)
    doc.line(24, pageHeight - 24, 84, pageHeight - 24)
    doc.text("Direction Glonetz", 24, pageHeight - 18)

    doc.save(`attestation-${certificate.level.toLowerCase()}-${summary.studentName.replace(/\s+/g, "-")}.pdf`)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <MobileBackButton />
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border-2 border-white/40">
              <AvatarFallback className="bg-white/20 text-lg font-bold text-white">
                ED
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">Mon profil</h1>
              <p className="text-sm text-primary-foreground/85">Gerez vos informations personnelles et securite.</p>
            </div>
          </div>
          <Badge className="w-fit bg-white/20 text-white hover:bg-white/25">Etudiant</Badge>
        </div>
        <div className="bg-black/10 px-5 py-3 text-xs text-primary-foreground/90 md:px-6">
          Matricule: ETU-2026-001 • Classe: {summary.className} • Niveau actuel: {enrolledLevel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-primary/15 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-primary" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={summary.studentName} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Input value={summary.className} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Telephone principal</Label>
                <Input value="+237 600 000 001" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value="etudiant.demo@glonetz.com" readOnly />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ces informations sont en lecture seule. Contactez l'administration pour une modification.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4 text-primary" />
                Securite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <KeyRound className="mr-2 size-4" />
                Changer PIN / mot de passe
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <LogOut className="mr-2 size-4" />
                Deconnexion de tous les appareils
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/15 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-primary" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-payment" className="text-sm">Notification paiement</Label>
                <Switch id="notif-payment" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-claim" className="text-sm">Notification reclamation</Label>
                <Switch id="notif-claim" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-deadline" className="text-sm">Rappel d'echeance</Label>
                <Switch id="notif-deadline" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            Actions rapides
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="sm:min-w-44">
            <Link href="/dashboard/effectuer-paiement">Effectuer un paiement</Link>
          </Button>
          <Button asChild variant="outline" className="sm:min-w-44">
            <Link href="/dashboard/mes-paiements">Mes paiements</Link>
          </Button>
          <Button asChild variant="outline" className="sm:min-w-44">
            <Link href="/dashboard/reclamations">Nouvelle reclamation</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            Attestations de formation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Les attestations sont telechargeables uniquement lorsqu'elles sont rendues disponibles par l'administration.
          </p>
          <div className="space-y-3">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">Niveau {certificate.level}</p>
                  <p className="text-xs text-muted-foreground">
                    {certificate.status === "disponible"
                      ? `Disponible depuis ${certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString("fr-FR") : "aujourd'hui"}`
                      : "En cours de validation"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={certificate.status === "disponible" ? "default" : "secondary"}>
                    {certificate.status === "disponible" ? "Disponible" : "En cours"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={certificate.status === "disponible" ? "outline" : "ghost"}
                    disabled={certificate.status !== "disponible"}
                    onClick={() => downloadCertificate(certificate)}
                  >
                    Telecharger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

