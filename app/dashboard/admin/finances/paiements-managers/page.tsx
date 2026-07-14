import { redirect } from "next/navigation"

export default function PaiementsManagersRedirectPage() {
  redirect("/dashboard/admin/finances/fonds-managers?tab=history")
}
