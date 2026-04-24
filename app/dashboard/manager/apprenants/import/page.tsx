"use client"

import { LearnerImportPage } from "@/components/apprenants/learner-import-page"

export default function ManagerLearnerImportPage() {
  return (
    <LearnerImportPage
      backHref="/dashboard/manager/apprenants"
      afterImportHref="/dashboard/manager/apprenants"
    />
  )
}
