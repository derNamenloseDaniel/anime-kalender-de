import type { Release, Title } from '../../shared/types.ts'
import { anzeigeName } from '../../shared/titles.ts'
import { primeVideoSearchUrl } from '../../shared/plattform-suche.ts'
import { istKeineTitelseite } from './11-7-wege-aus-terminen.ts'
import { adresseDesWegs } from './13-1-termin-adressen.ts'
import type { OffeneSuche } from './13-3-suchadressen-endzustand.ts'

/**
 * **Eine Prime-Pille, die in die Amazon-Suche führt, ist ein Suchauftrag** (Daniel, 26.11.2026: Last Boss Queen, Pille ohne Adresse, Auftrag nirgends
 * gelistet). `pillenZiel` (web) baut die Suche erst im Browser; ohne diese Liste kannte weder der Bau noch die Erweiterung sie. Gemeint ist, was nach
 * `richteTerminAdressen` noch ohne Titelseite bleibt; je Titel ein Auftrag. Er bleibt auch bei einer Prime-Seite eines anderen Kanals stehen (`schreibeSuchadressenImEndzustand`).
 */
export function offeneTerminSuchen(releases: Release[], titles: Title[]): OffeneSuche[] {
  const titelNachId = new Map(titles.map((t) => [t.id, t]))
  const je = new Map<number, OffeneSuche>()
  for (const r of releases) {
    if (r.platform !== 'primevideo' || r.releaseType === 'disc' || r.buyUrl) continue
    if (r.platformUrl && !istKeineTitelseite(r.platformUrl)) continue
    const titel = titelNachId.get(r.titleId)
    if (!titel || je.has(r.titleId)) continue
    const name = anzeigeName(titel)
    je.set(r.titleId, { id: r.titleId, titel: name, plattform: 'primevideo', url: r.platformUrl ?? primeVideoSearchUrl(name), termin: true })
  }
  return [...je.values()]
}

/**
 * Wächter-Kern (Daniel, 26.11.2026: „jeder Suchlink führt direkt auf die Seite oder steht auf der Suchauftragsliste“): Prime-Pillen des fertigen Bestands,
 * die in die Suche führen und weder einen Direktlink desselben Kanals haben (`adresseDesWegs`) noch auf der Liste stehen (`auftragsIds`). Titel mit Prime-Handbeleg (`geprueft`) legt die Erweiterung nicht erneut vor: sie zählen als `ungeklaert` (Ratsche im Aufrufer), nicht als Verstoß.
 */
export function suchlinksOhneAusweg(
  releases: Release[],
  titles: Title[],
  auftragsIds: ReadonlySet<number>,
  geprueft: ReadonlySet<number> = new Set(),
): { probleme: string[]; ungeklaert: number[] } {
  const titelNachId = new Map(titles.map((t) => [t.id, t]))
  const probleme: string[] = []
  const ungeklaert: number[] = []
  for (const r of releases) {
    if (r.platform !== 'primevideo' || r.releaseType === 'disc' || r.buyUrl) continue
    if (r.platformUrl && !istKeineTitelseite(r.platformUrl)) continue
    const titel = titelNachId.get(r.titleId)
    if (!titel) continue
    const direkt = adresseDesWegs(r, titel)
    if (direkt) probleme.push(`${r.slug}: Pille führt in die Suche, der Direktlink desselben Kanals liegt vor (${direkt})`)
    else if (auftragsIds.has(r.titleId)) continue
    else if (geprueft.has(r.titleId)) ungeklaert.push(r.titleId)
    else probleme.push(`${r.slug}: Pille führt in die Suche, Titel ${r.titleId} steht auf keiner Suchauftragsliste`)
  }
  return { probleme, ungeklaert }
}
