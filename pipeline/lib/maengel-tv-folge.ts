import type { Release } from '../../shared/types.ts'

/**
 * TV-Sichtung ohne Folgennummer (22.11.2026): Die Sendung nennt einen Folgentitel, `sendungenAnhaengen` fand ihn in keiner
 * Folgenliste („Ein Lied im Nebel“ bei Pokémon Horizonte, Wikipedia führt „Lied im Nebel“). Ohne Nummer gibt es auch keine Staffel.
 */
export const tvSichtungOhneFolge = (releases: Release[]): boolean =>
  releases.some((r) => r.platform === 'tv' && r.sendungen?.some((s) => s.folge && s.nr === undefined))
