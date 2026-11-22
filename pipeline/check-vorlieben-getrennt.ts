/**
 * Zusicherungen zur Trennung der Vorlieben je Ansicht (Filterkonzept 22.11.2026; Daniel: „⊘ Disc" in der Datenbank setzte auch
 * das Kalender-Auge). Kalender und Datenbank haben je einen Schlüssel (`vorlieben.kalender`, `vorlieben.datenbank`); ein Chip der einen Ansicht
 * ändert den Speicher der anderen nicht, ein Ansichtswechsel schreibt nichts, das Push-Abo hängt nur am Kalender, und der alte gemeinsame
 * Schlüssel wird beim Lesen als Kopie genommen (Migration, vorbei frühestens 31.01.2027). Aufruf: `npm run check:logic`.
 */
import { schreibeTerminFilter } from '../shared/push-filter.ts'
import { EMPTY_FILTERS, emptyLists, type FilterState } from '../web/src/lib/filters.ts'
import { kalenderFilter, kalenderGrundlage } from '../web/src/lib/kalender-filter.ts'
import { parseHash, schreiber, type AppRoute, type Umgebung } from '../web/src/lib/router.ts'
import { vorliebenLesen, vorliebenNachfuehren } from '../web/src/lib/vorlieben.ts'
import { todayIso } from '../shared/time.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const speicher = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
    removeItem: (k: string) => void speicher.delete(k),
  },
})
const umg = (hash = ''): Umgebung =>
  ({ ort: { pathname: '/', search: '', hash }, verlauf: { state: null, replaceState() {}, pushState() {}, back() {} }, base: '' }) as unknown as Umgebung
const mitDisc: FilterState = { ...EMPTY_FILTERS, excluded: { ...emptyLists(), releaseTypes: ['disc'] } }
const route = (view: string, filters: FilterState = EMPTY_FILTERS): AppRoute => ({ view, date: todayIso(), filters }) as AppRoute
const schluessel = () => [...speicher.keys()].sort().join()

console.log('\nJede Ansicht hat ihren Speicher:')
speicher.clear()
schreiber(route('woche'), () => undefined, () => umg()).navigate({ filters: mitDisc })
pruefe('Kalender-Auge „Disc" schreibt nur vorlieben.kalender', schluessel() === 'vorlieben.kalender', schluessel())
pruefe('… die Datenbank startet danach ohne Disc-Ausschluss', !parseHash('#/datenbank').filters.excluded.releaseTypes.includes('disc'))
pruefe('… der Kalender behält ihn', parseHash('#/woche').filters.excluded.releaseTypes.includes('disc'))

speicher.clear()
schreiber(route('datenbank'), () => undefined, () => umg()).navigate({ filters: mitDisc })
pruefe('Datenbank-Chip „Disc aus" schreibt nur vorlieben.datenbank', schluessel() === 'vorlieben.datenbank', schluessel())
pruefe('… der Kalender startet danach ohne Disc-Ausschluss', !parseHash('#/woche').filters.excluded.releaseTypes.includes('disc'))

console.log('\nAnsichtswechsel:')
speicher.clear()
const gesetzt: AppRoute[] = []
schreiber(route('datenbank', mitDisc), (r) => void gesetzt.push(r), () => umg('#/woche')).navigate({ view: 'woche' })
pruefe('Wechsel Datenbank → Kalender schreibt nichts', speicher.size === 0, schluessel())
pruefe('… und der Kalender bekommt den Disc-Ausschluss der Datenbank nicht', gesetzt.length === 1 && !gesetzt[0]!.filters.excluded.releaseTypes.includes('disc'), gesetzt.map((r) => r.filters.excluded))
gesetzt.length = 0
schreiber(route('woche', mitDisc), (r) => void gesetzt.push(r), () => umg('#/datenbank')).navigate({ view: 'datenbank' })
pruefe('Wechsel Kalender → Datenbank: ohne Kalender-Disc, nichts geschrieben', speicher.size === 0 && !gesetzt[0]!.filters.excluded.releaseTypes.includes('disc'), gesetzt.map((r) => r.filters.excluded))

console.log('\nPush-Abo hängt nur am Kalender:')
speicher.clear()
const kalenderMitDisc = { ...EMPTY_FILTERS, excluded: { ...emptyLists(), releaseTypes: ['disc' as const] } }
const aufDatenbank = kalenderFilter(kalenderGrundlage(route('datenbank', mitDisc), undefined), EMPTY_FILTERS)
pruefe('Disc-Chip der Datenbank ändert den Push-Filter nicht', JSON.stringify(schreibeTerminFilter({ ...aufDatenbank, tvAus: false })) === JSON.stringify(schreibeTerminFilter({ ...EMPTY_FILTERS, tvAus: false })))
const nachKalender = kalenderGrundlage(route('woche', kalenderMitDisc), undefined)
pruefe('In der Datenbank gilt der zuletzt im Kalender gesehene Zustand', kalenderGrundlage(route('datenbank', EMPTY_FILTERS), nachKalender) === nachKalender)

console.log('\nMigration des alten Schlüssels:')
speicher.clear()
speicher.set('vorlieben', JSON.stringify({ discAus: true, availableOnly: true, confirmedOnly: true, favoritesOnly: true }))
const k = vorliebenLesen('kalender')
const d = vorliebenLesen('datenbank')
pruefe('Beide Ansichten starten mit der Kopie (Disc aus, Favoriten)', k.discAus && d.discAus && k.favoritesOnly && d.favoritesOnly)
pruefe('Kalender verwirft „verfügbar", Datenbank verwirft „bestätigt"', !k.availableOnly && k.confirmedOnly && d.availableOnly && !d.confirmedOnly, { k, d })
pruefe('Lesen allein schreibt nichts', schluessel() === 'vorlieben', schluessel())
const alt = { ...EMPTY_FILTERS }
vorliebenNachfuehren('kalender', alt, { ...alt, kostenlosOnly: true })
pruefe('Erster Schreibvorgang legt nur den Schlüssel der Ansicht an, der alte bleibt', schluessel() === 'vorlieben,vorlieben.kalender', schluessel())
pruefe('… die Datenbank liest weiter die Kopie', vorliebenLesen('datenbank').favoritesOnly && !vorliebenLesen('datenbank').kostenlosOnly)
vorliebenNachfuehren('datenbank', alt, { ...alt, kostenlosExcluded: true })
pruefe('Sobald beide Schlüssel existieren, entfällt der alte', schluessel() === 'vorlieben.datenbank,vorlieben.kalender', schluessel())

console.log('\nDie Datenbank kennt „bestätigt" nicht mehr:')
speicher.clear()
speicher.set('vorlieben.datenbank', JSON.stringify({ confirmedOnly: true }))
pruefe('Gespeichertes „bestätigt" und `sicher=1` wirken in der Datenbank nicht', !parseHash('#/datenbank?sicher=1').filters.confirmedOnly)

if (verletzt) {
  console.error(`\ncheck-vorlieben-getrennt: ${verletzt} Verletzung(en)`)
  process.exit(1)
}
console.log('\ncheck-vorlieben-getrennt: alle Zusicherungen grün')
