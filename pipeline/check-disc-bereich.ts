/**
 * Lässt den echten Disc-Bereich (`disc-bereich.tsx`, `disc-matrix.tsx`) auf dem Mini-DOM laufen (Mockup B3, F96, 27.10.2026):
 * Gesamtausgaben und Boxen offen, Volumes und Filme zugeklappt (Zahl und Jahre am Kopf), Vol. nur ohne Gesamtausgabe offen,
 * Händler und Kalender erst unter der angetippten Zeile; Kauflink „Bei Amazon“ (EAN) bzw. „Bei Amazon suchen“ (Name).
 * Fälle wörtlich aus der Bühne (`web/buehne/faelle.json`): Dan Da Dan, Detektiv Conan, Sakamoto Days. Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { DiscAusgabe, Release, Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom, klicke, type MiniKnoten } from '../tools/mini-dom.ts'
ignoriereCss()
const { DiscBereich } = await import('../web/src/components/detail/disc-bereich.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

interface Fall {
  titleId: number
  'titles.json': Title[]
  'releases.json': Release[]
  disc: Record<string, DiscAusgabe[]>
}
const faelle = (JSON.parse(readFileSync(new URL('../web/buehne/faelle.json', import.meta.url), 'utf8')) as { faelle: Record<string, Fall> }).faelle
/** Der Zeitpunkt der Bühne: weit genug vor den Terminen der Fälle, damit „kommend“ stabil bleibt. */
const HEUTE = '2026-10-11'

async function zeige(fall: Fall, aender?: (r: Release[]) => Release[], ausgaben?: DiscAusgabe[]) {
  const uhr = attrappeUhr()
  const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({}))
  const title = fall['titles.json'].find((t) => t.id === fall.titleId) ?? ({ id: fall.titleId } as Title)
  const releases = fall['releases.json'].filter((r) => r.releaseType === 'disc')
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  await act(async () => {
    wurzel.render(h(DiscBereich, { title, today: HEUTE, discAusgaben: ausgaben ?? Object.values(fall.disc).flat(), discReleases: aender ? aender(releases) : releases, kaufwege: [] }))
  })
  const knopf = (text: RegExp) => dom.wurzel.finde((k) => k.tagName === 'BUTTON' && text.test(k.textContent))[0]
  return {
    wurzel: dom.wurzel,
    knopf,
    text: () => dom.wurzel.textContent,
    klick: (k: MiniKnoten | undefined) => act(async () => klicke(dom.wurzel, k!)),
    haendler: () => dom.wurzel.finde((k) => k.getAttribute('data-disc-haendler') !== null),
    abbau: async () => {
      await act(async () => wurzel.unmount())
      dom.entferne()
    },
  }
}

console.log('Disc-Bereich: Dan Da Dan (Gesamtausgabe, Volumes)')
{
  const d = await zeige(faelle['dan-da-dan']!)
  pruefe('Gesamtausgaben offen', d.knopf(/^Gesamtausgaben/)?.getAttribute('aria-expanded') === 'true')
  const vol = d.knopf(/^Volumes/)
  pruefe('Volumes zugeklappt, Zahl und Jahre am Kopf', vol?.getAttribute('aria-expanded') === 'false' && /Volumes\s*· \d+ · 20\d\d/.test(vol.textContent), vol?.textContent)
  pruefe('zugeklappte Volumes zeigen keine Zeile', !/Vol\. 3/.test(d.text()))
  pruefe('ohne Tipp kein Händlerblock', d.haendler().length === 0)
  await d.klick(vol)
  pruefe('ein Tipp auf Volumes zeigt die Zeilen', /Vol\. 3/.test(d.text()))
  await d.klick(d.knopf(/^Vol\. 3/))
  pruefe('Tipp auf eine Zeile öffnet genau einen Händlerblock mit Namenssuche „Bei Amazon suchen“', d.haendler().length === 1 && /Bei Amazon suchen/.test(d.haendler()[0]!.textContent), d.haendler().map((k) => k.textContent))
  await d.klick(d.knopf(/^Vol\. 3/))
  pruefe('zweiter Tipp schließt ihn wieder', d.haendler().length === 0)
  await d.abbau()
}

console.log('Disc-Bereich: Detektiv Conan (Boxen, Filme)')
{
  const d = await zeige(faelle['fernsehtag-detektiv-conan']!)
  pruefe('Boxen offen', d.knopf(/^Boxen/)?.getAttribute('aria-expanded') === 'true')
  const film = d.knopf(/^Filme/)
  pruefe('Filme zugeklappt mit Zahl', film?.getAttribute('aria-expanded') === 'false' && /Filme\s*· \d+/.test(film.textContent), film?.textContent)
  await d.abbau()
}

console.log('Disc-Bereich: Sakamoto Days (nur Volumes)')
{
  const d = await zeige(faelle['sakamoto-days']!)
  pruefe('ohne Gesamtausgabe und Box stehen die Volumes offen', d.knopf(/^Volumes/)?.getAttribute('aria-expanded') === 'true')
  await d.abbau()
}

console.log('Disc-Bereich: Kauflink je Art (EAN, Produkt) und aniSearch nie Händler')
{
  const fall = faelle['sakamoto-days']!
  const mitUrl = (url: string) => (rs: Release[]) => rs.map((r) => ({ ...r, buyUrl: url, platformUrl: url }))
  const ean = await zeige(fall, mitUrl('https://www.amazon.de/s?k=4061229123456'))
  await ean.klick(ean.knopf(/^Vol\./))
  const eanText = ean.haendler()[0]?.textContent ?? ''
  pruefe('EAN-Suche heißt „Bei Amazon“, ohne „suchen“', /Bei Amazon/.test(eanText) && !/suchen/.test(eanText), eanText)
  await ean.abbau()
  const produkt = await zeige(fall, mitUrl('https://www.amazon.de/dp/B0CJ3GKPHF'))
  await produkt.klick(produkt.knopf(/^Vol\./))
  pruefe('Produktseite heißt „Kaufen bei Amazon“', /Kaufen bei Amazon/.test(produkt.haendler()[0]?.textContent ?? ''), produkt.haendler()[0]?.textContent)
  await produkt.abbau()
  const ani = await zeige(fall, mitUrl('https://www.anisearch.de/article/201864'))
  await ani.klick(ani.knopf(/^Vol\./))
  const block = ani.haendler()[0]
  const links = block?.finde((k) => k.tagName === 'A').map((k) => k.getAttribute('href')) ?? []
  pruefe('aniSearch ist Quelle, kein Händler: nur der Quellenlink, kein Kauflink', links.length === 1 && /anisearch\.de\/article\/\d+/.test(links[0] ?? '') && !/Amazon|Kaufen|Bei /.test(block?.textContent ?? ''), links)
  await ani.abbau()
}

console.log('Disc-Bereich: nur aniSearch-Ausgaben, keine Termine')
{
  const fall = faelle['dan-da-dan']!
  const d = await zeige(fall, () => [])
  pruefe('Zähler und Gruppen stehen auch ohne Termine', /Varianten/.test(d.text()) && d.knopf(/^Gesamtausgaben/) !== undefined, d.text())
  await d.abbau()
}

console.log('Folgenkarte: die Folgenliste geht nicht in den Kasten, sondern in die Karte darunter')
{
  const { KastenMitFolgenKarte } = await import('../web/src/components/detail/kasten-folgen.tsx')
  const baum = KastenMitFolgenKarte({ folgen: 'FOLGEN', antwort: { art: 'fertig' } } as never) as { props: { children: Array<{ props: Record<string, unknown> }> } }
  const [huelle, karte] = baum.props.children
  /* Der Kasten steht in der Hülle der Reihen-Reiter (F157): sie bekommt dieselben Eigenschaften und den Kasten als Element. */
  const kasten = huelle!.props.kasten as { props: Record<string, unknown> }
  const eigenschaften = huelle!.props.eigenschaften as Record<string, unknown>
  pruefe('der Kasten bekommt keine Folgenliste', kasten.props.folgen === undefined && kasten.props.antwort !== undefined, Object.keys(kasten.props))
  pruefe('die Reiter-Hülle bekommt keine Folgenliste', eigenschaften.folgen === undefined && eigenschaften.antwort !== undefined, Object.keys(eigenschaften))
  pruefe('die Karte trägt die Folgenliste und die Marke', karte!.props.children === 'FOLGEN' && karte!.props['data-folgen-karte'] === true, karte!.props)
}

console.log('Varianten: Randfälle')
{
  const { fuegeZusammen, istKommend, jahre, kompaktDatum, startOffen } = await import('../web/src/components/detail/disc-varianten.ts')
  type V = Parameters<typeof jahre>[0][number]
  const v = (zusatz: Partial<V>): V => ({ schluessel: 'x', art: 'box', nummer: 1, name: 'Box 1', edition: '', formate: ['b'], datumJe: { b: '2026-11-13' }, haendler: [], ...zusatz })
  pruefe('jahre: Spanne über zwei Jahre', jahre([v({ datumJe: { b: '2019-03-01' } }), v({ datumJe: { b: '2026-12-18' } })]) === '2019–2026')
  pruefe('jahre: ein Jahr, Datum ohne Tag („-00“)', jahre([v({ datumJe: { b: '2025-08-00' } })]) === '2025')
  pruefe('jahre: ohne jedes Datum leer, nicht „undefined“', jahre([v({ datumJe: {} })]) === '')
  pruefe('startOffen: mit Gesamtausgabe: Gesamt und Box offen, Vol. zu', startOffen([v({ art: 'gesamt' }), v({ art: 'vol' })], 'gesamt') && startOffen([v({ art: 'gesamt' }), v({ art: 'vol' })], 'box') && !startOffen([v({ art: 'gesamt' }), v({ art: 'vol' })], 'vol'))
  pruefe('startOffen: nur eine Box neben Film: Film zu', !startOffen([v({ art: 'box' }), v({ art: 'film' })], 'film'))
  pruefe('startOffen: ohne Gesamtausgabe und Box ist alles offen', startOffen([v({ art: 'vol' }), v({ art: 'film' })], 'vol') && startOffen([v({ art: 'vol' }), v({ art: 'film' })], 'film'))
  const termin = v({ formate: ['b'], datumJe: { b: '2026-11-13' }, haendler: [{ name: 'Amazon', url: 'https://www.amazon.de/dp/B0CJ3GKPHF' }] })
  const artikel = v({ formate: ['d'], datumJe: { d: '2026-11-20' }, quelle: 'https://www.anisearch.de/article/216719' })
  const zusammen = fuegeZusammen([artikel, termin])
  pruefe('Termin und Artikel derselben Ausgabe werden eine Zeile', zusammen.length === 1, zusammen.length)
  pruefe('… mit beiden Formaten und dem Datum je Format (nicht eins für beide)', zusammen[0]!.formate.join() === 'b,d' && zusammen[0]!.datumJe.b === '2026-11-13' && zusammen[0]!.datumJe.d === '2026-11-20', zusammen[0])
  pruefe('… Händler vom Termin, Quelle vom Artikel', zusammen[0]!.haendler.length === 1 && zusammen[0]!.quelle === artikel.quelle, zusammen[0])
  const doppelt = fuegeZusammen([termin, v({ datumJe: { b: '2026-12-31' } })])
  pruefe('gleiches Format in beiden Zeilen: das erste Datum bleibt', doppelt.length === 1 && doppelt[0]!.datumJe.b === '2026-11-13', doppelt[0])
  pruefe('verschiedene Nummern bleiben getrennt', fuegeZusammen([v({ nummer: 1 }), v({ nummer: 2, name: 'Box 2' })]).length === 2)
  pruefe('istKommend: Datum ohne Tag gilt als Monatsende', istKommend('2026-09-00', '2026-09-15') && !istKommend('2026-09-00', '2026-09-30') && !istKommend(undefined, '2026-09-15'))
  pruefe('kompaktDatum: mit und ohne Tag', kompaktDatum('2025-12-12') === '12.12.25' && kompaktDatum('2026-09-00') === 'Sep 26')
}

console.log('Ausgaben: Termin ohne Artikelbezug und aniSearch-Artikel am selben Tag sind eine Ausgabe')
{
  const { discAusgabenVon } = await import('../web/src/components/detail/disc-ausgaben.ts')
  const { variantenVon } = await import('../web/src/components/detail/disc-varianten.ts')
  const titel = { id: 900310, titleRomaji: 'Probetitel' } as Title
  const termin = (slug: string, datum: string, edition: string, sources: string[] = ['https://beispiel.invalid/news']): Release =>
    ({ slug, titleId: 900310, name: 'Probetitel – Staffel 1', platform: 'disc', releaseType: 'disc', edition, buyUrl: `https://www.amazon.de/s?k=402062865401${slug.length}`, schedule: { firstEpisodeDate: datum }, sources }) as Release
  const gesamt: DiscAusgabe = ['Gesamtausgabe', 'b', 'g', '2026-09-03', 900311]
  const zeilen = (ausgaben: DiscAusgabe[], termine: Release[]) => discAusgabenVon(ausgaben, termine, titel)
  const eins = zeilen([gesamt], [termin('box', '2026-09-03', 'Complete Box, Blu-ray')])
  pruefe('gleicher Tag, gleiches Format, je genau einer: eine Zeile', eins.length === 1, eins.map((a) => a.schluessel))
  pruefe('… mit Artikel, Termin und Händler', eins[0]!.artikel.b === 900311 && eins[0]!.release?.slug === 'box' && /amazon/.test(eins[0]!.shopUrl ?? ''), eins[0])
  const v = variantenVon(eins, 'Probetitel')
  pruefe('… die Variante heißt „Gesamtausgabe“ und steht unter Gesamtausgaben', v.length === 1 && v[0]!.name === 'Gesamtausgabe' && v[0]!.art === 'gesamt', v.map((x) => [x.name, x.art]))
  pruefe('anderer Tag: zwei Zeilen', zeilen([gesamt], [termin('box', '2026-09-04', 'Complete Box, Blu-ray')]).length === 2)
  pruefe('anderes Format: zwei Zeilen', zeilen([gesamt], [termin('box', '2026-09-03', 'Complete Box, DVD')]).length === 2)
  pruefe('Termin ohne Datum: zwei Zeilen', zeilen([['Gesamtausgabe', 'b', 'g', '', 900311]], [termin('box', '', 'Complete Box, Blu-ray')]).length === 2)
  const zweiArtikel = zeilen([gesamt, ['Gesamtausgabe: Limited', 'b', 'g', '2026-09-03', 900312]], [termin('box', '2026-09-03', 'Complete Box, Blu-ray')])
  pruefe('zwei Artikel am Tag: nicht eindeutig, der Termin bleibt eine eigene Zeile', zweiArtikel.length === 3, zweiArtikel.map((a) => a.schluessel))
  const zweiTermine = zeilen([gesamt], [termin('box', '2026-09-03', 'Complete Box, Blu-ray'), termin('limited', '2026-09-03', 'Limited Edition, Blu-ray')])
  pruefe('zwei lose Termine am Tag: nicht eindeutig, drei Zeilen', zweiTermine.length === 3, zweiTermine.map((a) => a.schluessel))
  const band = (name: string): Release => ({ ...termin('band', '2026-09-03', 'Limited Edition, Blu-ray'), name })
  pruefe('„Vol. 2“ am Tag der Gesamtausgabe ist nicht die Gesamtausgabe (Dan Da Dan, 30.10.2026)', zeilen([gesamt], [band('Probetitel – Vol. 2')]).length === 2)
  pruefe('„Vol. 2“ ist nicht „Vol. 3/3“', zeilen([['Vol. 3/3: Limited Edition', 'b', 't', '2026-09-03', 900313]], [band('Probetitel – Vol. 2')]).length === 2)
  pruefe('„Box 9“ ist „Box 09“', zeilen([['Box 09', 'b', 't', '2026-09-03', 900314]], [band('Probetitel – Box 9')]).length === 1)
  const mitBezug = zeilen([gesamt], [termin('lose', '2026-09-03', 'Complete Box, Blu-ray'), termin('bezug', '2026-09-03', 'Limited Edition, Blu-ray', ['https://www.anisearch.de/article/900311'])])
  pruefe('ein Artikel, den ein anderer Termin nennt, ist nicht frei: der Bezug gewinnt, der lose Termin bleibt eigen', mitBezug.length === 2 && mitBezug.find((a) => a.artikel.b === 900311)?.release?.slug === 'bezug', mitBezug.map((a) => [a.schluessel, a.release?.slug]))
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-disc-bereich: alle Zusicherungen erfüllt')
