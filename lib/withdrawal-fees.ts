/**
 * Grille (unifiée) des charges de retrait Mobile Money — Cameroun / XAF.
 *
 * Sert à estimer la charge à ajouter lors d'un transfert admin -> staff
 * « avec charge », pour que le bénéficiaire dispose du montant NET une fois
 * les frais de retrait MTN / Orange Money déduits.
 *
 * Basée sur les grilles publiques (à jour 2026) :
 *  - MTN MoMo : 54 F (<= 4 166) · 1% (4 167–333 332) · 4 004 F (333 333–500 000)
 *  - Orange Money : 54 F (<= 3 333) · 1,5% (3 334–266 666) · 4 004 F (266 667–500 000),
 *    et 1% via l'app dès 5 000 F.
 *
 * La grille ci-dessous est CONFIGURABLE : ajuste librement les tranches.
 * (Les taxes d'État éventuelles — 0,2% + 4 F — ne sont pas incluses ici.)
 */

export type FeeBracket =
  | { min: number; max: number; kind: "percent"; rate: number; minFee?: number }
  | { min: number; max: number; kind: "flat"; flat: number }

export const WITHDRAWAL_FEE_GRID: FeeBracket[] = [
  { min: 1, max: 4999, kind: "percent", rate: 0.015, minFee: 54 },
  { min: 5000, max: 333332, kind: "percent", rate: 0.01 },
  { min: 333333, max: 500000, kind: "flat", flat: 4004 },
  // Repli pour les transferts internes au-delà du plafond de retrait (500 000).
  { min: 500001, max: Number.POSITIVE_INFINITY, kind: "percent", rate: 0.01 },
]

/**
 * Calcule la charge de retrait estimée pour un montant net (XAF), arrondie à
 * l'entier le plus proche. Renvoie 0 pour un montant invalide ou <= 0.
 */
export function computeWithdrawalFee(amount: number, grid: FeeBracket[] = WITHDRAWAL_FEE_GRID): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const bracket = grid.find((b) => amount >= b.min && amount <= b.max)
  if (!bracket) return 0
  if (bracket.kind === "flat") return bracket.flat
  const fee = Math.round(amount * bracket.rate)
  return bracket.minFee ? Math.max(fee, bracket.minFee) : fee
}
