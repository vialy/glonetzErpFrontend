import { redirect } from "next/navigation"

export default function AffectationManagerRedirectPage() {
  redirect("/dashboard/admin/finances/fonds-managers")
}
