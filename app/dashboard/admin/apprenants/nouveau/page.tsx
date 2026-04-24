import { NewLearnerAccountPage } from "@/components/apprenants/new-learner-account-page"

export default function AdminNewLearnerPage() {
  return (
    <NewLearnerAccountPage
      backHref="/dashboard/admin/apprenants"
      afterSubmitHref="/dashboard/admin/apprenants"
      importHref="/dashboard/admin/apprenants/import"
    />
  )
}
