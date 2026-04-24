import { NewLearnerAccountPage } from "@/components/apprenants/new-learner-account-page"

export default function ManagerNewLearnerPage() {
  return (
    <NewLearnerAccountPage
      backHref="/dashboard/manager/apprenants"
      afterSubmitHref="/dashboard/manager/apprenants"
      importHref="/dashboard/manager/apprenants/import"
    />
  )
}
