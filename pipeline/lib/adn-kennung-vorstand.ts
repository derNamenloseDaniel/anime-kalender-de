import type { Release, Title } from '../../shared/types.ts'
import type { AdnData } from './adn.ts'
import { readJson } from './util.ts'
import { abgaengeOhneGrund, leseVorstandJson } from './vorstand-abgang.ts'

/** Ein Stand der Ausgabe, soweit sie ADN-Shows trägt: Wege (`titles.json`) und Termine (`releases.json`). */
export interface AdnAusgabe {
  titles: Title[]
  releases: Release[]
}

const SHOW = /\/video\/(\d+)(?:[-/?#]|$)/

/** ADN-showIds, die die Ausgabe über einen Weg oder einen Termin führt. */
export function adnShowsInAusgabe(a: AdnAusgabe): Set<string> {
  const urls = [
    ...a.titles.flatMap((t) => t.streams.filter((s) => s.platform === 'adn').map((s) => s.url)),
    ...a.releases.filter((r) => r.platform === 'adn').map((r) => r.platformUrl ?? ''),
  ]
  return new Set(urls.map((u) => SHOW.exec(u)?.[1]).filter((id): id is string => id !== undefined))
}

/**
 * ADN-showIds, die im Vorstand einen Weg oder Termin hatten und jetzt keinen, obwohl der Kalender (`data/adn.json`, Sammler, nicht der
 * Bau) die Show noch führt. Die Zuordnung Show → Titel rechnet der Bau selbst (`loeseAdnTitelIds`); geht sie verloren, fällt das so auf.
 */
export function adnAbgaenge(vorher: AdnAusgabe, jetzt: AdnAusgabe, kalender: AdnData['shows']): string[] {
  const imKalender = new Set(kalender.map((s) => String(s.showId)))
  return abgaengeOhneGrund(adnShowsInAusgabe(vorher), adnShowsInAusgabe(jetzt), (k) => !imKalender.has(k))
}

/** Die Wache am echten Bestand: Fehlerzeilen gegen den Vorstand `ref`; ein nicht lesbarer Vorstand ist selbst ein Fehler. */
export function adnGegenVorstand(ref: string): string[] {
  const ausgabe = (lies: <T>(pfad: string, leer: T) => T): AdnAusgabe => ({
    titles: lies<Title[]>('public/data/titles.json', []),
    releases: lies<Release[]>('public/data/releases.json', []),
  })
  let vorher: AdnAusgabe
  try {
    vorher = ausgabe((pfad, leer) => leseVorstandJson(pfad, ref) ?? leer)
  } catch (e) {
    return [`Vorstand ${ref} nicht lesbar: ${(e as Error).message.split('\n')[0]}`]
  }
  const kalender = readJson<AdnData>('data/adn.json', { scrapedAt: '', window: { from: '', to: '' }, shows: [] }).shows
  const weg = adnAbgaenge(vorher, ausgabe(readJson), kalender)
  return weg.length ? [`${weg.length} ADN-Show(s) im Kalender hatten im Vorstand ${ref} Weg oder Termin und jetzt keins: ${weg.slice(0, 10).join(', ')}`] : []
}
