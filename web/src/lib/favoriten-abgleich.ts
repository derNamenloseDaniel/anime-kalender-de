import { useEffect } from 'react'
import { starteTakt } from './favoriten-takt.ts'
import { gleicheAb, type AbgleichAnschluss } from './favoriten-vereinigen.ts'
import { favoritenSetzen, lesFavoriten } from './favorites.ts'
import { getSyncToken, gesendeterStand, merkeGesendet, pullFavorites, pushFavorites } from './newsletterSync.ts'

const anschluss = (token: string): AbgleichAnschluss => ({
  hole: () => pullFavorites(token),
  sende: (ids) => pushFavorites(token, ids),
  lokal: lesFavoriten,
  setzeLokal: favoritenSetzen,
  basis: gesendeterStand,
  merkeBasis: merkeGesendet,
})

/** Hält die Favoriten eines zweiten Geräts aktuell (Serverstand holen, vereinigen, zurückschicken). */
export function useFavoritenAbgleich(): void {
  useEffect(
    () =>
      starteTakt({
        token: getSyncToken,
        sichtbar: () => document.visibilityState !== 'hidden',
        jetzt: Date.now,
        abgleichen: (token) => gleicheAb(anschluss(token)),
        bei: (e, f) => document.addEventListener(e, f),
        ab: (e, f) => document.removeEventListener(e, f),
      }),
    [],
  )
}
