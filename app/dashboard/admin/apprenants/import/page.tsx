"use client"

import { LearnerImportPage } from "@/components/apprenants/learner-import-page"

export default function AdminLearnerImportPage() {
  return (
    <LearnerImportPage
      backHref="/dashboard/admin/apprenants"
      afterImportHref="/dashboard/admin/apprenants"
    />
  )
}
