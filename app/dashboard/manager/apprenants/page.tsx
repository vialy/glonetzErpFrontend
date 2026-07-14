// L'espace manager réutilise la même page apprenants que l'admin : une seule
// implémentation, branchée sur l'API partagée (/staff/users). La base de route
// est déduite de l'URL côté composant, donc la navigation reste sous /manager.
export { default } from "@/app/dashboard/admin/apprenants/page"
