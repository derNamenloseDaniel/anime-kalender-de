/**
 * Zusicherung (20.11.2026, Daniel: „aufteilen in einzelne Staffeln, statt alles in 1“): Führt die Detaildatei Staffelgrenzen (`s`), zeigt der
 * echte Folgenbereich ab zwei Staffeln Reiter an einer Abschnittsbox (F157, 24.11.2026) mit Folgenzahl, Lage und Synchro je Staffel; eine
 * Staffel bleibt bei ihrer Zeile, ohne `s` bleiben die Pakete zu 50. Fixture wie Pokémon Horizonte (aniSearch-Liste 1–122, Staffeln 1–45,
 * 46–89, 90–136, offen ab 137, deutsch 1–137). Läuft in `check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, MiniKnoten } from '../tools/mini-dom.ts'
import { staffelAbschnitte, staffelZeile, type StaffelZeile } from '../web/src/components/detail/folgen-staffeln.ts'
import type { Release } from '../shared/types.ts'
ignoriereCss()
const { FolgenMitNachlegern } = await import('../web/src/components/detail/nachleger-zeilen.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const F: [number, string][] = Array.from({ length: 122 }, (_, i) => [i + 1, `Folge ${i + 1}`])
const S: StaffelZeile[] = [[1, 1, 45], [2, 46, 89], [3, 90, 136], [4, 137]]
const DE: [number, number][] = [[1, 137]]
const imDe = (nr: number) => DE.some(([a, b]) => nr >= a && nr <= b)

/* Reine Funktion. */
const ab = staffelAbschnitte(S, F, DE, imDe)
pruefe('vier Abschnitte mit Folgenzahl 45/44/47/1', ab.map((a) => a.folgen.length).join() === '45,44,47,1', ab.map((a) => a.folgen.length))
pruefe('Deutsch je Staffel 45/44/47/1', ab.map((a) => a.deutsch).join() === '45,44,47,1', ab.map((a) => a.deutsch))
pruefe('Staffel 3 reicht über die Liste hinaus: Folge 123 ohne Titel, 136 am Ende', ab[2]!.folgen.find(([n]) => n === 123)?.[1] === '' && ab[2]!.folgen.at(-1)?.[0] === 136)
pruefe('Staffel 1 trägt die Titel der Liste', ab[0]!.folgen[0]?.[1] === 'Folge 1' && ab[0]!.folgen.at(-1)?.[0] === 45)
pruefe('offene Staffel bis zur höchsten deutschen Folge', ab[3]!.offen && ab[3]!.bis === 137 && !ab[0]!.offen)
pruefe('offene Staffel ohne Deutsch und ohne Liste: nur ihre erste Folge', staffelAbschnitte([[1, 1, 2], [2, 3]], [[1, ''], [2, '']], [], () => false)[1]!.bis === 3)
pruefe('offene Staffel folgt dem deutschen Bereich über Liste und Beginn hinaus', staffelAbschnitte([[1, 1, 2], [2, 3]], [[1, ''], [2, ''], [3, '']], [[1, 5]], () => true)[1]!.bis === 5)
pruefe('offene Staffel folgt der Liste, wo sie weiter reicht', staffelAbschnitte([[1, 1, 2], [2, 3]], [[1, ''], [5, '']], [], () => false)[1]!.bis === 5)
pruefe('Zeile geschlossene Staffel', staffelZeile(ab[1]!) === 'Folge 46–89 · 44 von 44 auf Deutsch', staffelZeile(ab[1]!))
pruefe('Zeile offene Staffel ohne „von N“', staffelZeile(ab[3]!) === 'ab Folge 137 · läuft · 1 auf Deutsch', staffelZeile(ab[3]!))
pruefe('Deutsch zählt nur belegte Folgen', staffelAbschnitte([[1, 1, 4]], [], [[2, 3]], (n) => n === 2 || n === 3)[0]!.deutsch === 2)
pruefe('ohne s keine Abschnitte', staffelAbschnitte(undefined, F, DE, imDe).length === 0 && staffelAbschnitte([], F, DE, imDe).length === 0)

/* Echte Komponente: Staffel-Reiter an der Abschnittsbox (F157) ab zwei Staffeln; Gegenfälle ohne `s` (Pakete) und mit einer Staffel (Zeile wie bisher). */
const S3: StaffelZeile[] = [[1, 1, 45], [2, 46, 89], [3, 90, 136]]
const LISTEN: Record<string, unknown> = {
  900501: { f: F, de: DE, s: S },
  900502: { f: F, de: DE },
  900503: { f: F, de: [[1, 89]], s: S3, min: 24 },
  /* Eine Staffel, länger als die Titelliste (70 gegen 60): Kopf, Folgen und Paketzahl folgen der Staffel. */
  900504: { f: F.slice(0, 60), de: [[1, 10]], s: [[7, 1, 70]] },
}
globalThis.fetch = (async (adresse: unknown) => {
  const url = String(adresse)
  const treffer = /folgen\/(\d+)\.json/.exec(url)
  const daten = url.includes('folgen/index.json') ? Object.keys(LISTEN).map(Number) : treffer ? LISTEN[treffer[1]!] : undefined
  return { ok: Boolean(daten), status: daten ? 200 : 404, json: async () => daten }
}) as unknown as typeof fetch

/* Die Reiterzeile misst ihre Breite (ResizeObserver) und rollt den gewählten Reiter in die Mitte (querySelector): im Mini-DOM ohne Wirkung. */
Object.assign(MiniKnoten.prototype, { querySelector: () => null, querySelectorAll: () => [] })
Object.assign(globalThis, { ResizeObserver: class { observe() {} disconnect() {} } })

type Stand = { text: string; reiter: string[]; gewaehlt: string[]; marken: string[]; abschnitt: string }

/**
 * Rendert den Folgenbereich (über `FolgenMitNachlegern`, damit `releases`/`today` durchgereicht werden), klickt optional einen Reiter,
 * dann den Aufklapp-Knopf, und liefert Text, Reiter, gewählte Reiter, Lage-Marken und die Kopfzeile der Abschnittsbox.
 */
async function bereich(id: number, reiterText?: string, releases: Release[] = [], mehr: { zu?: boolean; laufzeitImKopf?: boolean; danach?: number } = {}): Promise<Stand> {
  const dom = installiereMiniDom({ ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({ src: '', srcset: '', sizes: '', decode: () => Promise.resolve() }))
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  const zeige = (titleId: number) => act(async () => wurzel.render(h(FolgenMitNachlegern, { titleId, wege: [], antwort: null as never, releases, today: '2026-11-24', laufzeitImKopf: mehr.laufzeitImKopf })))
  await zeige(id)
  await act(async () => Promise.resolve())
  const reiterKnoepfe = () => dom.wurzel.finde((k) => k.getAttribute('role') === 'tab')
  const ziel = reiterText ? reiterKnoepfe().find((k) => (k.textContent ?? '').trim() === reiterText) : undefined
  if (ziel) await act(async () => klicke(dom.wurzel, ziel))
  /* Titelwechsel im selben Panel: die Wahl des vorigen Titels gilt nicht weiter. */
  if (mehr.danach) await zeige(mehr.danach)
  await act(async () => Promise.resolve())
  const knopf: MiniKnoten | undefined = dom.wurzel.finde((k) => k.tagName === 'BUTTON' && k.getAttribute('aria-expanded') !== null)[0]
  if (knopf && !mehr.zu) await act(async () => klicke(dom.wurzel, knopf))
  await act(async () => Promise.resolve())
  const text = (dom.wurzel.textContent ?? '').replace(/\s+/g, ' ')
  const reiter = reiterKnoepfe().map((k) => (k.textContent ?? '').trim())
  const gewaehlt = reiterKnoepfe().filter((k) => k.getAttribute('aria-selected') === 'true').map((k) => (k.textContent ?? '').trim())
  const marken = dom.wurzel.finde((k) => k.getAttribute('data-lage') !== null).map((k) => k.getAttribute('data-lage')!)
  const box = dom.wurzel.finde((k) => k.getAttribute('data-staffel-abschnitt') !== null)[0]
  const abschnitt = (box?.finde((k) => k.tagName === 'P')[0]?.textContent ?? '').trim()
  await act(async () => wurzel.unmount())
  dom.entferne()
  return { text, reiter, gewaehlt, marken, abschnitt }
}

const mit = await bereich(900501)
pruefe('mit s: Reiter 1–4 (nur die Nummer)', mit.reiter.join() === '1,2,3,4', mit.reiter)
pruefe('mit s: laufende Staffel 4 ist gewählt', mit.gewaehlt.join() === '4', mit.gewaehlt)
pruefe('mit s: Marke „läuft“ nur an Staffel 4', mit.marken.join() === 'laeuft', mit.marken)
pruefe('mit s: Kopfzeile der offenen Staffel', mit.abschnitt === 'ab Folge 137 · läuft · Deutsch: Fg. 1', mit.abschnitt)
pruefe('mit s: aufgeklappt nur Folge 137', mit.text.includes('137—') && !/Folge 136(?!\d)/.test(mit.text), mit.text.slice(-120))
pruefe('mit s: keine Pakete und kein Gesamtkopf „Folgen (137)“', !mit.text.includes('Folgen (') && !mit.reiter.some((r) => r.includes('–')), mit.text.slice(0, 80))
const eins = await bereich(900501, '1')
pruefe('Reiter 1: gewählt, Kopfzeile mit Folgenzahl und Synchro', eins.gewaehlt.join() === '1' && eins.abschnitt === 'Folge 1–45 · 45 Folgen · alle auf Deutsch', eins.abschnitt)
pruefe('Reiter 1: Folgen der Staffel 2 stehen nicht in Staffel 1', !/Folge 46(?!\d)/.test(eins.text) && /Folge 45(?!\d)/.test(eins.text))
const drei = await bereich(900501, '3')
pruefe('Reiter 3: Folge 123 ohne Titel bis 136', drei.text.includes('123—') && drei.text.includes('136—') && !drei.text.includes('137—'), drei.text.slice(-120))
const zu = await bereich(900503)
pruefe('geschlossen ohne Termin: letzte deutsche Staffel (2) gewählt, keine Marke', zu.gewaehlt.join() === '2' && zu.marken.length === 0, zu)
const termin = { slug: 'x', titleId: 900503, platform: 'netflix', releaseType: 'batch', schedule: { firstEpisodeDate: '2026-12-01', firstEpisodeNumber: 100, episodeCount: 1 } } as unknown as Release
const kommt = await bereich(900503, undefined, [termin])
pruefe('Termin in Staffel 3 ohne deutsche Folge: Ring an 3, gewählt bleibt 2', kommt.marken.join() === 'kommt' && kommt.gewaehlt.join() === '2', kommt)
const drittKommt = await bereich(900503, '3', [termin])
pruefe('Reiter 3 mit Termin: Kopfzeile „kommt“', drittKommt.abschnitt === 'Folge 90–136 · 47 Folgen · kommt', drittKommt.abschnitt)
pruefe('Laufzeit je Folge am Knopf der Box', zu.text.includes('~24 Min. je Folge'), zu.text.slice(0, 120))
const kopfLaufzeit = await bereich(900503, undefined, [], { laufzeitImKopf: true })
pruefe('Laufzeit schon im Kopf: nicht noch einmal in der Box', !kopfLaufzeit.text.includes('Min. je Folge'))
const zugeklappt = await bereich(900501, '1', [], { zu: true })
pruefe('zugeklappt: Kopfzeile ja, Folgen nein', zugeklappt.abschnitt.startsWith('Folge 1–45') && !/Folge 45(?!\d)/.test(zugeklappt.text), zugeklappt.text.slice(-120))
const gewechselt = await bereich(900501, '1', [], { danach: 900503 })
pruefe('Titelwechsel: Wahl „1“ des vorigen Titels verfällt, Startreiter 2', gewechselt.gewaehlt.join() === '2', gewechselt.gewaehlt)
const ohne = await bereich(900502)
pruefe('ohne s: Pakete zu 50 und Kopf mit Listenlänge', ohne.reiter.join() === '1–50,51–100,101–122' && ohne.text.includes('Folgen (122)'), ohne.reiter)
pruefe('ohne s: keine Staffelzeile, keine Box', !ohne.text.includes('auf Deutsch') && !ohne.abschnitt)
const einzeln = await bereich(900504)
pruefe('eine Staffel: keine Reiter, Zeile wie bisher', einzeln.reiter.length === 0 && einzeln.text.includes('Folge 1–70 · 10 von 70 auf Deutsch') && !einzeln.abschnitt, einzeln.text.slice(0, 120))
pruefe('eine Staffel: Kopf „Folgen (70)“ und Folge 70 ohne Titel', einzeln.text.includes('Folgen (70)') && einzeln.text.includes('70—'), einzeln.text.slice(-80))

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-folgen-staffeln: ok (Abschnitte, Staffel-Reiter mit Lage und Kopfzeile, Gegenfälle ohne s und mit einer Staffel)')
