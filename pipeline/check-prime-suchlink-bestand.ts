/**
 * Bestandswache (Daniel, 26.11.2026): Jede Prime-Pille des gebauten Bestands, die in die Amazon-Suche führt, hat entweder keinen Direktlink desselben Kanals
 * oder steht auf der Suchauftragsliste (`public/data/prime-suche.json`, die Liste der Erweiterung; Quelle `data/suchadressen-offen.json`). Der Fall mit Fixture: `check-prime-suchlink-direkt.ts`.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Release, Title } from '../shared/types.ts'
import { suchlinksOhneAusweg } from './bau/13-3-termin-suchen.ts'
import { ladeHandbelege } from './lib/dub-confirmed.ts'
import { meldeVerletzte } from './lib/quarantaene.ts'
import { readJson, ROOT } from './lib/util.ts'

/**
 * Ratsche „offen darf nur sinken“ (Stand 26.11.2026, an der Kulisse nachgerechnet): Aniverse-Termine, deren Titel einen Prime-Handbeleg ohne Kanalangabe hat. Die Pille sucht,
 * die Erweiterung legt den Titel nicht erneut vor (`geprueftePrime`), und ob die gemeldete Seite die des Kanals ist, belegt nichts. Sinkt die Zahl, hier nachziehen.
 */
const UNGEKLAERT_HOECHSTENS = 18

for (const datei of ['public/data/releases.json', 'public/data/titles.json']) {
  if (!existsSync(resolve(ROOT, datei))) {
    console.error(`FEHLER: ${datei} fehlt — erst bauen`)
    console.log('VERSTÖSSE: 1')
    process.exit(1)
  }
}
const releases = readJson<Release[]>('public/data/releases.json', [])
const titles = readJson<Title[]>('public/data/titles.json', [])
const erweiterung = Object.values(readJson<Record<string, { id?: number }>>('public/data/prime-suche.json', {}))
const auftraege = new Set<number>(erweiterung.map((e) => e.id).filter((i): i is number => typeof i === 'number'))
const geprueft = new Set(ladeHandbelege().filter((b) => b.platform === 'primevideo').map((b) => b.anilistId))
const { probleme: verstoesse, ungeklaert } = suchlinksOhneAusweg(releases, titles, auftraege, geprueft)
const probleme = [...verstoesse]
if (ungeklaert.length > UNGEKLAERT_HOECHSTENS) probleme.push(`${ungeklaert.length} Prime-Pillen suchen trotz Handbeleg ohne Direktlink (Grenze ${UNGEKLAERT_HOECHSTENS}): ${ungeklaert.join(', ')}`)
const slugZuTitel = new Map(releases.map((r) => [r.slug, r.titleId]))
meldeVerletzte(probleme.map((text) => ({ id: slugZuTitel.get(text.split(':')[0]!) ?? 0, text })), 'prime-suchlink-bestand', 'Prime-Pille führt in die Suche ohne Direktlink und ohne Suchauftrag', () => true)
for (const p of probleme) console.error(`FEHLER: ${p}`)
console.log(`Prime-Suchlinks im Bestand: ${releases.filter((r) => r.platform === 'primevideo').length} Prime-Termine, ${auftraege.size} Suchaufträge geprüft, ${ungeklaert.length} mit Handbeleg ungeklärt (Grenze ${UNGEKLAERT_HOECHSTENS})`)
console.log(`VERSTÖSSE: ${probleme.length}`)
process.exit(probleme.length ? 1 : 0)
