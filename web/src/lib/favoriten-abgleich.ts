import { useEffect } from 'react'
import { vereinigeFavoriten } from './favoriten-vereinigen.ts'
import { favoritenSetzen, lesFavoriten } from './favorites.ts'
import { getSyncToken, gesendeterStand, merkeGesendet, pullFavorites, pushFavorites } from './newsletterSync.ts'

const stand = (ids: Iterable<number>) => [...ids].sort((a, b) => a - b).join(',')
const MIN_ABSTAND_MS = 60_000
let letzterAbgleich = 0

/** Holt den Serverstand, führt ihn mit dem lokalen zusammen und schickt ihn zurück, wenn er abweicht. */
export async function gleicheFavoritenAb(token: string): Promise<void> {
  const server = new Set(await pullFavorites(token))
  const lokal = lesFavoriten()
  const roh = gesendeterStand()
  const basis = roh === null ? null : new Set(roh.split(',').filter(Boolean).map(Number))
  const vereint = vereinigeFavoriten(basis, lokal, server)
  const text = stand(vereint)
  // Basis erst nach gelungenem Push merken; vor dem lokalen Schreiben, damit `useNewsletterSync` nicht doppelt schickt.
  if (text !== stand(server)) await pushFavorites(token, [...vereint].sort((a, b) => a - b))
  merkeGesendet(text)
  if (text !== stand(lokal)) favoritenSetzen(vereint)
}

/** Gleicht beim Öffnen und bei jeder Rückkehr in den Tab ab (höchstens einmal je Minute), damit zweite Geräte nicht veralten. */
export function useFavoritenAbgleich(): void {
  useEffect(() => {
    const los = () => {
      const token = getSyncToken()
      if (!token || document.visibilityState === 'hidden' || Date.now() - letzterAbgleich < MIN_ABSTAND_MS) return
      letzterAbgleich = Date.now()
      gleicheFavoritenAb(token).catch(() => undefined)
    }
    los()
    document.addEventListener('visibilitychange', los)
    return () => document.removeEventListener('visibilitychange', los)
  }, [])
}
