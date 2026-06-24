/**
 * Cache memoire ultra-leger, a duree de vie = session de l'onglet (perdu au
 * rechargement complet de la page, conserve lors des navigations internes).
 *
 * Objectif : afficher instantanement une page deja consultee (lecture du cache)
 * tout en revalidant les donnees en arriere-plan (stale-while-revalidate).
 * Ce n'est pas un remplacant de React Query : juste de quoi eviter le "skeleton"
 * a chaque retour sur une page.
 */
const store = new Map<string, unknown>()

export function getCached<T>(key: string): T | undefined {
  return store.has(key) ? (store.get(key) as T) : undefined
}

export function hasCached(key: string): boolean {
  return store.has(key)
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, value)
}

export function clearCached(key: string): void {
  store.delete(key)
}

/** Vide tout le cache (ex: a la deconnexion pour ne pas exposer des donnees stale). */
export function clearAllCached(): void {
  store.clear()
}
