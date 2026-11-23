import { useEffect, useRef } from 'react'
import { starteTakt } from './favoriten-takt.ts'
import { ergaenzungBeimErstabgleich, gleicheAb, standText, type AbgleichAnschluss } from './favoriten-vereinigen.ts'
import { favoritenErgaenzen, favoritenMitDatum, favoritenSetzen, lesFavoriten } from './favorites.ts'
import { getSyncToken, gesendeterStand, merkeGesendet, pullFavorites, pushFavorites, vergissAltenSendestand } from './newsletterSync.ts'

const ENTPRELLUNG_MS = 2500

const anschluss = (token: string): AbgleichAnschluss => ({
  hole: () => pullFavorites(token),
  sende: (ids) => pushFavorites(token, ids),
  lokal: lesFavoriten,
  setzeLokal: favoritenSetzen,
  basis: gesendeterStand,
  merkeBasis: merkeGesendet,
})

/*
  Migration bis 31.12.2026 (danach Ergänzung und `vergissAltenSendestand` entfernen): Der Abgleich vom
  23.11.2026 19:47 las den alten Sendestand als Basis und löschte Titel, die ein anderes Gerät auf dem Server
  überschrieben hatte. Beim ersten Abgleich mit der neuen Basis kommen sie aus der Datums-Ablage zurück.
*/
function vorbereiten(): void {
  favoritenErgaenzen(ergaenzungBeimErstabgleich(gesendeterStand(), favoritenMitDatum()))
  vergissAltenSendestand()
}

/** Ein Abgleich nach dem anderen: Takt und Sternänderung dürfen sich nicht überholen. */
let kette: Promise<void> = Promise.resolve()
export function abgleichen(token: string): Promise<void> {
  kette = kette
    .then(() => {
      vorbereiten()
      return gleicheAb(anschluss(token))
    })
    .catch(() => undefined)
  return kette
}

/**
 * Hält die Favoriten mit dem Server gleich: beim Öffnen, bei Rückkehr in den Tab und nach jeder
 * Sternänderung — immer als Vereinigung mit dem Serverstand, nie als blindes Überschreiben,
 * sonst löscht ein Gerät, was das andere gerade gemerkt hat.
 */
export function useFavoritenAbgleich(favorites: Set<number>): void {
  useEffect(
    () =>
      starteTakt({
        token: getSyncToken,
        sichtbar: () => document.visibilityState !== 'hidden',
        jetzt: Date.now,
        abgleichen,
        bei: (f) => document.addEventListener('visibilitychange', f),
        ab: (f) => document.removeEventListener('visibilitychange', f),
      }),
    [],
  )
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => sternGeaendert(favorites, timer), [favorites])
}

/** Nach einer Sternänderung entprellt abgleichen; gibt das Aufräumen für den Effekt zurück. */
export function sternGeaendert(favorites: Set<number>, timer: { current?: ReturnType<typeof setTimeout> }): (() => void) | undefined {
  const token = getSyncToken()
  if (!token || standText(favorites) === gesendeterStand()) return
  clearTimeout(timer.current)
  timer.current = setTimeout(() => void abgleichen(token), ENTPRELLUNG_MS)
  return () => clearTimeout(timer.current)
}
