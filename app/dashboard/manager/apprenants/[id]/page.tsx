// Réutilise la fiche apprenant partagée (mêmes hooks/services API que l'admin).
// La base de rôle est dérivée de l'URL, donc les liens restent sous /manager.
export { default } from "@/app/dashboard/admin/apprenants/[id]/page"
