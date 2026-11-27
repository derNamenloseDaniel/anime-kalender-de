/**
 * Lässt den echten Disc-Bereich (`disc-bereich.tsx`, `disc-pillen.tsx`) auf dem Mini-DOM laufen (Mockup `disc-bereich-3` A, 26.11.2026):
 * jede Variante eine Pille, die ohne Aufklappen zum Händler führt (ohne Händler zum aniSearch-Artikel); eine Gruppe mit einem Eintrag
 * und eine einzige Gruppe klappen nie zu, Volumes und Filme mit mehreren Einträgen neben Gesamtausgaben oder Boxen starten zugeklappt
 * (Zahl und Jahre am Kopf); Kauflink „Bei Amazon“ (EAN) bzw. „Bei Amazon suchen“ (Name).
 * Fälle wörtlich aus der Bühne (`web/buehne/faelle.json`): Dan Da Dan, Detektiv Conan, Sakamoto Days, Last Boss Queen. Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { act, createElement as h, type ReactNode } from 'react'
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

async function zeige(fall: Fall, aender?: (r: Release[]) => Release[], ausgaben?: DiscAusgabe[], kaufwege: ReactNode[] = []) {
  const uhr = attrappeUhr()
  const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({}))
  const title = fall['titles.json'].find((t) => t.id === fall.titleId) ?? ({ id: fall.titleId } as Title)
  const releases = fall['releases.json'].filter((r) => r.releaseType === 'disc')
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  await act(async () => {
    wurzel.render(h(DiscBereich, { title, today: HEUTE, discAusgaben: ausgaben ?? Object.values(fall.disc).flat(), discReleases: aender ? aender(releases) : releases, kaufwege }))
  })
  const knopf = (text: RegExp) => dom.wurzel.finde((k) => k.tagName === 'BUTTON' && text.test(k.textContent))[0]
  return {
    wurzel: dom.wurzel,
    knopf,
    text: () => dom.wurzel.textContent,
    klick: (k: MiniKnoten | undefined) => act(async () => klicke(dom.wurzel, k!)),
    /** Die sichtbaren Varianten: Text der Pille und die Adresse, zu der sie führt (ohne Ziel `null`). */
    pillen: () =>
      dom.wurzel
        .finde((k) => k.getAttribute('data-disc-variante') !== null)
        .map((k) => ({
          text: k.textContent,
          href: k.finde((a) => a.tagName === 'A')[0]?.getAttribute('href') ?? null,
          merken: k.finde((b) => b.tagName === 'BUTTON').length,
          klasse: k.finde((a) => a.tagName === 'A')[0]?.getAttribute('class') ?? '',
          /** Klasse des Datums („ab …“ bzw. „seit …“). */
          datumKlasse: k.finde((s) => s.tagName === 'SPAN' && /^(ab|seit) \d/.test(s.textContent))[0]?.getAttribute('class') ?? '',
        })),
    kopf: () => dom.wurzel.finde((k) => k.getAttribute('data-disc-kopf') !== null).map((k) => k.textContent),
    klassenVon: (text: RegExp) => dom.wurzel.finde((k) => k.tagName === 'A' && text.test(k.textContent)).map((k) => k.getAttribute('class') ?? ''),
    knoepfe: () => dom.wurzel.finde((k) => k.tagName === 'BUTTON'),
    /** Zahl der sichtbaren Pillen einer Gruppe (`data-disc-gruppe`). */
    inGruppe: (art: string) => dom.wurzel.finde((k) => k.getAttribute('data-disc-gruppe') === art)[0]?.finde((k) => k.getAttribute('data-disc-variante') !== null).length ?? 0,
    abbau: async () => {
      await act(async () => wurzel.unmount())
      dom.entferne()
    },
  }
}

console.log('Disc-Bereich: Dan Da Dan (Gesamtausgabe, Volumes)')
{
  const d = await zeige(faelle['dan-da-dan']!)
  pruefe('die Gruppe mit einem Eintrag hat keinen Klappknopf, nur ihren Namen', d.knopf(/^Gesamtausgaben/) === undefined && /Gesamtausgaben/.test(d.text()), d.knoepfe().map((k) => k.textContent))
  const offen = d.pillen()
  pruefe('… und ihre Pille steht ohne Tipp da, mit dem aniSearch-Artikel als Ziel („Details bei aniSearch“)', offen.length === 1 && /^Gesamtausgabe/.test(offen[0]!.text) && /anisearch\.de\/article\/214677$/.test(offen[0]!.href ?? '') && /Details bei aniSearch/.test(offen[0]!.text), offen)
  pruefe('Format als Marke und „ab“ für Kommendes, Edition mit „ · “ hinter dem Namen', /^Gesamtausgabe · LimitedBlu-rayDVDab 30\.10\.26/.test(offen[0]!.text), offen[0]!.text)
  pruefe('Kommendes steht in Akzent und fett', /font-bold/.test(offen[0]!.datumKlasse) && /text-ak-akzent-text/.test(offen[0]!.datumKlasse), offen[0]!.datumKlasse)
  pruefe('die Gruppe mit einem Eintrag nennt keine Zahl („· 1“)', !/Gesamtausgaben\s*·/.test(d.text()), d.text().slice(0, 60))
  pruefe('die Pille füllt die Zeile (flex-1), nicht inline wie eine Stream-Pille', /(^| )flex-1( |$)/.test(offen[0]!.klasse) && !/inline-flex/.test(offen[0]!.klasse), offen[0]!.klasse)
  const vol = d.knopf(/^Volumes/)
  pruefe('Volumes (mehrere) zugeklappt, Zahl und Jahre am Kopf, Pfeil nach unten', vol?.getAttribute('aria-expanded') === 'false' && /Volumes\s*· \d+ · 20\d\d.*▾$/.test(vol.textContent), vol?.textContent)
  pruefe('zugeklappte Volumes zeigen keine Pille', !/Vol\. 3/.test(d.text()))
  await d.klick(vol)
  const alle = d.pillen()
  const vol3 = alle.filter((p) => /^Vol\. 3/.test(p.text))
  pruefe('ein Tipp auf Volumes zeigt die Pillen, der Pfeil zeigt nach oben', vol3.length > 0 && /▴$/.test(d.knopf(/^Volumes/)!.textContent), alle.map((p) => p.text))
  const erschienen = alle.find((p) => /seit \d/.test(p.text))
  pruefe('Erschienenes steht leise, ohne Akzent', erschienen !== undefined && !/font-bold|akzent/.test(erschienen.datumKlasse), erschienen?.datumKlasse)
  pruefe('jede Pille mit Händler führt ohne weiteren Tipp dorthin: Namenssuche heißt „Bei Amazon suchen“', vol3.some((p) => /amazon\.de\/s\?k=/.test(p.href ?? '') && /Bei Amazon suchen/.test(p.text)), vol3)
  pruefe('keine Pille ohne Ziel', alle.every((p) => p.href), alle.filter((p) => !p.href))
  pruefe('Kalenderknopf nur an Kommendem mit Termin', alle.some((p) => p.merken === 1) && alle.filter((p) => /seit \d/.test(p.text) && !/ab \d/.test(p.text)).every((p) => p.merken === 0), alle.map((p) => [p.text, p.merken]))
  await d.klick(vol)
  pruefe('zweiter Tipp klappt die Volumes wieder zu', d.pillen().length === d.pillen().filter((p) => !/^Vol\./.test(p.text)).length)
  await d.abbau()
}

console.log('Disc-Bereich: Detektiv Conan (Boxen, Filme)')
{
  const d = await zeige(faelle['fernsehtag-detektiv-conan']!)
  pruefe('Boxen offen', d.knopf(/^Boxen/)?.getAttribute('aria-expanded') === 'true')
  const film = d.knopf(/^Filme/)
  pruefe('Filme zugeklappt mit Zahl', film?.getAttribute('aria-expanded') === 'false' && /Filme\s*· \d+/.test(film.textContent), film?.textContent)
  const mehr = d.knopf(/^Alle \d+ anzeigen/)
  pruefe('lange Gruppe: sechs Pillen und ein Knopf für den Rest', d.inGruppe('box') === 6 && mehr !== undefined, d.inGruppe('box'))
  await d.klick(mehr)
  pruefe('… ein Tipp zeigt alle, der Knopf verschwindet', d.inGruppe('box') > 8 && d.inGruppe('box') === Number(/\d+/.exec(mehr!.textContent)![0]) && d.knopf(/^Alle \d+ anzeigen/) === undefined, d.inGruppe('box'))
  await d.abbau()
}

console.log('Disc-Bereich: Sakamoto Days (nur Volumes)')
{
  const d = await zeige(faelle['sakamoto-days']!)
  pruefe('eine einzige Gruppe hat keinen Kopf und klappt nicht: alle Pillen stehen da', d.knopf(/^Volumes/) === undefined && !/Volumes/.test(d.text()) && d.pillen().length > 1, d.text().slice(0, 80))
  pruefe('ab zwei Varianten steht die Zahl am Kopf, der Verlag mit „ · “ dahinter', d.kopf().length === 1 && /^\d+ Varianten · Netflix, Inc\.$/.test(d.kopf()[0]!), d.kopf())
  await d.abbau()
}

console.log('Disc-Bereich: Grenze der langen Liste und leerer Kopf')
{
  const fall = faelle['sakamoto-days']!
  const baende = (n: number): DiscAusgabe[] => Array.from({ length: n }, (_, i) => [`Vol. ${i + 1}/${n}`, 'b', 't', `2025-0${(i % 9) + 1}-10`, 900400 + i] as DiscAusgabe)
  const acht = await zeige(fall, () => [], baende(8))
  pruefe('acht Varianten stehen alle da, ohne Knopf', acht.pillen().length === 8 && acht.knoepfe().length === 0, acht.pillen().length)
  await acht.abbau()
  const neun = await zeige(fall, () => [], baende(9))
  pruefe('neun Varianten: sechs und „Alle 9 anzeigen“', neun.pillen().length === 6 && neun.knopf(/^Alle 9 anzeigen/) !== undefined, neun.pillen().length)
  await neun.abbau()
  const stream = h('a', { key: 'k', href: 'https://beispiel.invalid/shop', className: 'probe-kaufweg' }, 'Shop')
  const eine = await zeige(fall, () => [], baende(1), [stream])
  pruefe('eine Variante ohne Verlag: kein Kopf, auch kein leerer', eine.kopf().length === 0 && /^Vol\. 1/.test(eine.text()), eine.text())
  pruefe('ohne Edition folgt dem Namen gleich das Format, kein „ · “', /^Vol\. 1Blu-rayseit 10\.01\.25/.test(eine.pillen()[0]!.text), eine.pillen()[0]!.text)
  pruefe('die übrigen Kaufwege der Seite stehen unter den Varianten', eine.klassenVon(/^Shop$/).join() === 'probe-kaufweg' && /Shop$/.test(eine.text()), eine.text())
  await eine.abbau()
}

console.log('Pille: breit nur auf Wunsch')
{
  const { Pille } = await import('../web/src/components/detail/pille.tsx')
  const fall = faelle['sakamoto-days']!
  const d = await zeige(fall, () => [], [['Vol. 1/1', 'b', 't', '2025-01-10', 900450]], [h(Pille, { key: 'p', name: 'Probeshop', url: 'https://beispiel.invalid/shop' })])
  const klasse = d.klassenVon(/^Probeshop$/)[0] ?? ''
  pruefe('eine Pille ohne „breit“ bleibt inline (Stream- und Kaufweg-Pillen)', /inline-flex max-w-full/.test(klasse) && !/flex-1|rounded-b-none/.test(klasse), klasse)
  const spalten = d.wurzel.finde((k) => k.tagName === 'SPAN' && /flex min-w-0 flex-col/.test(k.getAttribute('class') ?? '')).map((k) => [k.textContent.slice(0, 6), /(^| )flex-1( |$)/.test(k.getAttribute('class') ?? '')])
  pruefe('die Textspalte der breiten Pille füllt den Rest (das Ziel steht rechts), die der schmalen nicht', JSON.stringify(spalten) === JSON.stringify([['Vol. 1', true], ['Probes', false]]), spalten)
  pruefe('die Disc-Pille daneben ist breit, ohne Fußzeilen-Form', /flex-1/.test(d.pillen()[0]!.klasse) && !/rounded-b-none|inline-flex/.test(d.pillen()[0]!.klasse), d.pillen()[0]!.klasse)
  await d.abbau()
}

console.log('Disc-Bereich: The Most Heretical Last Boss Queen (eine Box aus zwei Quellen, Daniel 26.11.2026)')
{
  const fall = faelle['last-boss-queen']!
  const d = await zeige(fall, undefined, fall.disc[String(fall.titleId)])
  const pillen = d.pillen()
  pruefe('eine Pille statt „Gesamtausgaben · 1“ und „Sonstiges · 1“', pillen.length === 1 && /^Gesamtausgabe/.test(pillen[0]!.text) && !/Sonstiges|Gesamtausgaben/.test(d.text()), d.text())
  pruefe('kein Klappknopf, kein Tipp nötig: die Pille führt zur EAN-Suche („Bei Amazon“, ohne „suchen“)', d.knoepfe().length === 0 && /amazon\.de\/s\?k=4020628654016$/.test(pillen[0]!.href ?? '') && /Bei Amazon/.test(pillen[0]!.text) && !/suchen/.test(pillen[0]!.text), pillen)
  pruefe('Erschienenes heißt „seit“, der Verlag steht am Kopf, „1 Variante“ nicht', /Blu-rayseit 03\.09\.26/.test(pillen[0]!.text) && /^KSM Anime/.test(d.text()) && !/Variante/.test(d.text()), d.text())
  await d.abbau()
}

console.log('Disc-Bereich: Kauflink je Art (EAN, Produkt) und aniSearch nie Händler')
{
  const fall = faelle['sakamoto-days']!
  const mitUrl = (url: string) => (rs: Release[]) => rs.map((r) => ({ ...r, buyUrl: url, platformUrl: url }))
  const ean = await zeige(fall, mitUrl('https://www.amazon.de/s?k=4061229123456'))
  const mitTermin = (d: Awaited<ReturnType<typeof zeige>>) => d.pillen().filter((p) => p.href && !/anisearch/.test(p.href))
  const eanText = mitTermin(ean)[0]?.text ?? ''
  pruefe('EAN-Suche heißt „Bei Amazon“, ohne „suchen“', /Bei Amazon/.test(eanText) && !/suchen/.test(eanText), eanText)
  await ean.abbau()
  const produkt = await zeige(fall, mitUrl('https://www.amazon.de/dp/B0CJ3GKPHF'))
  pruefe('Produktseite heißt „Kaufen bei Amazon“', /Kaufen bei Amazon/.test(mitTermin(produkt)[0]?.text ?? ''), mitTermin(produkt)[0]?.text)
  await produkt.abbau()
  const ani = await zeige(fall, mitUrl('https://www.anisearch.de/article/201864'))
  const pillen = ani.pillen()
  pruefe('aniSearch ist Quelle, kein Händler: jedes Ziel ist ein Artikel und heißt „Details bei aniSearch“, nie „Kaufen“ oder „Bei …“', pillen.length > 0 && pillen.every((p) => !p.href || (/anisearch\.de\/article\/\d+$/.test(p.href) && /Details bei aniSearch/.test(p.text))) && !/Amazon|Kaufen|Bei /.test(ani.text()), pillen)
  await ani.abbau()
}

console.log('Disc-Bereich: nur aniSearch-Ausgaben, keine Termine')
{
  const fall = faelle['dan-da-dan']!
  const d = await zeige(fall, () => [])
  pruefe('Zähler und Gruppen stehen auch ohne Termine', /Varianten/.test(d.text()) && /Gesamtausgaben/.test(d.text()) && d.knopf(/^Volumes/) !== undefined, d.text())
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
  const { formateJeDatum, zielVon } = await import('../web/src/components/detail/disc-varianten.ts')
  const suche = { name: 'Amazon', url: 'https://www.amazon.de/s?k=Probe%20Blu-ray' }
  const eanLink = { name: 'Amazon', url: 'https://www.amazon.de/s?k=4020628654016' }
  const seite = { name: 'Amazon', url: 'https://www.amazon.de/dp/B0CJ3GKPHF' }
  pruefe('zielVon: Produktseite vor EAN-Suche vor Namenssuche, gleich in welcher Reihenfolge', zielVon(v({ haendler: [suche, eanLink, seite] }))?.url === seite.url && zielVon(v({ haendler: [suche, eanLink] }))?.url === eanLink.url && zielVon(v({ haendler: [suche] }))?.haendler === 'Amazon')
  const reihen = [[seite, suche], [suche, seite], [eanLink, suche], [suche, eanLink], [seite, eanLink, suche], [eanLink, seite], [eanLink, suche, seite]]
  const beste = reihen.map((haendler) => zielVon(v({ haendler }))?.url)
  pruefe('zielVon: jede Reihenfolge liefert den genauesten Link', JSON.stringify(beste) === JSON.stringify([seite.url, seite.url, eanLink.url, eanLink.url, seite.url, seite.url, seite.url]), beste)
  pruefe('zielVon: ohne Händler der aniSearch-Artikel, ohne Händlernamen', JSON.stringify(zielVon(v({ quelle: artikel.quelle }))) === JSON.stringify({ url: artikel.quelle }))
  pruefe('zielVon: Händler schlägt den Artikel; ohne beides kein Ziel', zielVon(v({ haendler: [suche], quelle: artikel.quelle }))?.url === suche.url && zielVon(v({})) === undefined)
  pruefe('formateJeDatum: gleiches Datum zusammen, verschiedene getrennt, in Formatreihenfolge', JSON.stringify(formateJeDatum(v({ formate: ['b', 'd', 'u'], datumJe: { b: '2026-11-13', d: '2026-11-20', u: '2026-11-13' } }))) === JSON.stringify([{ datum: '2026-11-13', formate: ['b', 'u'] }, { datum: '2026-11-20', formate: ['d'] }]))
  pruefe('formateJeDatum: Format ohne Datum bleibt stehen', JSON.stringify(formateJeDatum(v({ formate: ['b'], datumJe: {} }))) === JSON.stringify([{ datum: '', formate: ['b'] }]))
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
  const andererTag = zeilen([gesamt], [termin('box', '2026-09-04', 'Complete Box, Blu-ray')])
  pruefe('anderer Tag: zwei Zeilen, jede mit ihrem Datum', andererTag.map((a) => a.datum).join() === '2026-09-03,2026-09-04', andererTag.map((a) => a.datum))
  const zweiFormate = zeilen([gesamt], [termin('dvd', '2026-09-03', 'Complete Box, DVD'), termin('bluray', '2026-09-03', 'Complete Box, Blu-ray')])
  pruefe('DVD- und Blu-ray-Termin am Tag eines Blu-ray-Artikels: nur der Blu-ray-Termin ist der Artikel, die DVD bleibt eigen', zweiFormate.length === 2 && zweiFormate.find((a) => a.artikel.b === 900311)?.release?.slug === 'bluray', zweiFormate.map((a) => [a.schluessel, a.release?.slug]))
  const komplett = variantenVon(zeilen([['Komplettset', 'b', 'g', '2026-09-03', 900315]], []), 'Probetitel')
  pruefe('eine Gesamtausgabe mit eigenem Namen („Komplettset“) behält ihn', komplett[0]!.name === 'Komplettset' && komplett[0]!.art === 'gesamt', komplett.map((x) => x.name))
  const mitNamen = variantenVon(zeilen([['Komplettset', 'b', 'g', '2026-09-03', 900315]], [{ ...termin('ga', '2026-09-03', 'Blu-ray', ['https://www.anisearch.de/article/900315']), name: 'Gesamtausgabe – Sammleredition' }]), 'Probetitel')
  pruefe('ein Termin namens „Gesamtausgabe …“ heißt „Gesamtausgabe“, auch wenn der Artikel anders heißt', mitNamen.length === 1 && mitNamen[0]!.name === 'Gesamtausgabe', mitNamen.map((x) => x.name))
  pruefe('anderes Format: zwei Zeilen', zeilen([gesamt], [termin('box', '2026-09-03', 'Complete Box, DVD')]).length === 2)
  pruefe('Termin ohne Datum: zwei Zeilen', zeilen([['Gesamtausgabe', 'b', 'g', '', 900311]], [termin('box', '', 'Complete Box, Blu-ray')]).length === 2)
  const zweiArtikel = zeilen([gesamt, ['Gesamtausgabe: Limited', 'b', 'g', '2026-09-03', 900312]], [termin('box', '2026-09-03', 'Complete Box, Blu-ray')])
  pruefe('zwei Artikel am Tag: nicht eindeutig, der Termin bleibt eine eigene Zeile', zweiArtikel.length === 3, zweiArtikel.map((a) => a.schluessel))
  const zweiTermine = zeilen([gesamt], [termin('box', '2026-09-03', 'Complete Box, Blu-ray'), termin('limited', '2026-09-03', 'Limited Edition, Blu-ray')])
  pruefe('zwei lose Termine am Tag: nicht eindeutig, drei Zeilen', zweiTermine.length === 3, zweiTermine.map((a) => a.schluessel))
  const band = (name: string): Release => ({ ...termin('band', '2026-09-03', 'Limited Edition, Blu-ray'), name })
  pruefe('„Vol. 2“ am Tag der Gesamtausgabe ist nicht die Gesamtausgabe (Dan Da Dan, 30.10.2026)', zeilen([gesamt], [band('Probetitel – Vol. 2')]).length === 2)
  pruefe('„Vol. 2“ ist nicht „Vol. 3/3“', zeilen([['Vol. 3/3: Limited Edition', 'b', 't', '2026-09-03', 900313]], [band('Probetitel – Vol. 2')]).length === 2)
  pruefe('„Box 9“ ist „Box 09“', zeilen([['Box 09: Limited Edition', 'b', 't', '2026-09-03', 900314]], [band('Probetitel – Box 9')]).length === 1)
  const mitBezug = zeilen([gesamt], [termin('lose', '2026-09-03', 'Complete Box, Blu-ray'), termin('bezug', '2026-09-03', 'Limited Edition, Blu-ray', ['https://www.anisearch.de/article/900311'])])
  pruefe('ein Artikel, den ein anderer Termin nennt, ist nicht frei: der Bezug gewinnt, der lose Termin bleibt eigen', mitBezug.length === 2 && mitBezug.find((a) => a.artikel.b === 900311)?.release?.slug === 'bezug', mitBezug.map((a) => [a.schluessel, a.release?.slug]))
  /* Edition: Eine genannte Edition muss zum Artikel passen (PR 5252, Prüfer: 8 von 123 Paaren waren zwei Produkte). */
  const limitedArtikel: DiscAusgabe = ['Gesamtausgabe: Limited Edition', 'b', 'g', '2026-09-03', 900316]
  pruefe('Artikel „Limited“, Termin „Complete Box“ (Re:Monster, 04.09.2026): zwei Produkte, zwei Zeilen', zeilen([limitedArtikel], [termin('box', '2026-09-03', 'Complete Box, Blu-ray')]).length === 2)
  pruefe('Artikel schlicht, Termin „Limited Edition mit Sammelschuber“ (Tagebücher der Apothekerin): zwei Zeilen', zeilen([['Vol. 1/4', 'b', 't', '2026-09-03', 900317]], [band('Probetitel – Vol. 1')]).length === 2)
  pruefe('andere Art der Limited-Ausgabe (Steelbook gegen Collector’s): zwei Zeilen', zeilen([['Limited Steelbook Edition', 'b', 't', '2026-09-03', 900318]], [termin('c', '2026-09-03', 'Limited Collector’s Edition, Blu-ray')]).length === 2)
  pruefe('Termin ohne Editionsangabe (nur Format) passt zum Limited-Artikel am Tag: eine Zeile', zeilen([limitedArtikel], [termin('f', '2026-09-03', 'Blu-ray')]).length === 1)
  pruefe('Limited gegen „Limited Mediabook“: dieselbe Ausgabe, eine Zeile', zeilen([['Vol. 4/4: Limited Mediabook Edition', 'b', 't', '2026-09-03', 900319]], [termin('m', '2026-09-03', 'Limited Edition, Blu-ray')]).length === 1)
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('check-disc-bereich: alle Zusicherungen erfüllt')
