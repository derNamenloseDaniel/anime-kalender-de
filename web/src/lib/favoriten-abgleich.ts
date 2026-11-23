import { useEffect } from 'react'
import { gleicheAb } from './favoriten-vereinigen.ts'
import { favoritenSetzen, lesFavoriten } from './favorites.ts'
import { getSyncToken, gesendeterStand, merkeGesendet, pullFavorites, pushFavorites } from './newsletterSync.ts'

const MIN_ABSTAND_MS = 60_000
let letzterAbgleich = 0

/** Gleicht beim Öffnen und bei jeder Rückkehr in den Tab ab (höchstens einmal je Minute), damit zweite Geräte nicht veralten. */
export function useFavoritenAbgleich(): void {
  useEffect(() => {
    const los = () => {
      const token = getSyncToken()
      if (!token || document.visibilityState === 'hidden' || Date.now() - letzterAbgleich < MIN_ABSTAND_MS) return
      letzterAbgleich = Date.now()
      gleicheAb({
        hole: () => pullFavorites(token),
        sende: (ids) => pushFavorites(token, ids),
        lokal: lesFavoriten,
        setzeLokal: favoritenSetzen,
        basis: gesendeterStand,
        merkeBasis: merkeGesendet,
      }).catch(() => undefined)
    }
    los()
    document.addEventListener('visibilitychange', los)
    return () => document.removeEventListener('visibilitychange', los)
  }, [])
}
