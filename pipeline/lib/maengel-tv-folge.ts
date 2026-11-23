import type { Release, Title } from '../../shared/types.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import { sendungenAnhaengen, sendungNeuZuordnen } from './tv-termine.ts'
import type { WikiListen } from './tv-termine.ts'

/**
 * TV-Sichtung ohne Folgennummer (22.11.2026): Die Sendung nennt einen Folgentitel, `sendungenAnhaengen` fand ihn in keiner
 * Folgenliste („Ein Lied im Nebel“ bei Pokémon Horizonte, Wikipedia führt „Lied im Nebel“). Ohne Nummer gibt es auch keine Staffel.
 */
export const tvSichtungOhneFolge = (releases: Release[]): boolean =>
  releases.some((r) => r.platform === 'tv' && r.sendungen?.some((s) => s.folge && s.nr === undefined))

/**
 * Titel mit einer Sichtung ohne Nummer, gemessen über **alle** Sichtungen im Programmbestand, die einen TV-Termin tragen: Der Bau hängt nur
 * Sendungen ab gestern an (`08-news-tv.ts`), die Zahl der Art schwankte sonst mit dem Fenster und stünde meist auf 0. Die Termine werden kopiert.
 * Wie der Bau ordnet er die Sendungen vorher dem Titel zu, dessen Liste den Folgentitel führt (`sendungNeuZuordnen`; One Piece → Fish-Man Island Saga).
 */
export function titelMitSichtungOhneFolge(releases: Release[], sendungen: (TvSendung & { kennung?: string })[], wiki: WikiListen, titles: Map<number, Title>): Set<number> {
  const tv = releases.filter((r) => r.platform === 'tv').map((r) => ({ ...r, sendungen: undefined }))
  sendungenAnhaengen(tv, sendungNeuZuordnen(sendungen, titles, wiki), '0000-00-00', wiki)
  return new Set(tv.filter((r) => tvSichtungOhneFolge([r])).map((r) => r.titleId))
}
