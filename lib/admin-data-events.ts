/** Événements navigateur qui signalent un changement financier ou apprenant côté admin. */
export const ADMIN_PAYMENTS_UPDATED_EVENT = "admin-payments-updated"
export const ADMIN_LEARNERS_UPDATED_EVENT = "admin-learners-updated"
export const CERTIFICATES_UPDATED_EVENT = "certificates-updated"

/** Rafraîchir les écrans dont l'éligibilité dépend des paiements réels (certificats, trésorerie…). */
export const ADMIN_FINANCIAL_REFRESH_EVENTS = [
  ADMIN_PAYMENTS_UPDATED_EVENT,
  ADMIN_LEARNERS_UPDATED_EVENT,
] as const

export function notifyAdminPaymentsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_PAYMENTS_UPDATED_EVENT))
  }
}
