/**
 * Zusicherungen (Daniel, 26.11.2026, Most Heretical Last Boss Queen): Der Stream-Reiter zeigt nie einen Weg „nur Untertitel“ und jeden
 * Prime-Kanal nur einmal; gestrichen wird nur diese Dublette, nie ein Weg ohne Widerlegung. Die Kopfzeile folgt allen Wegen des Titels.
 * Reine Funktionen und die echte Panel-Verdrahtung (`usePanelAntwort`, Mini-DOM). Fester Tag, Fixtures; Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import type { Release, StreamLink, Title, WatchLink } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom } from '../tools/mini-dom.ts'
import { sortiereNachZugang } from '../web/src/components/detail/wege-sortieren.ts'
import { sichtbareTermine, sichtbareWege } from '../web/src/components/detail/wege-sichtbar.ts'
ignoriereCss()
const { usePanelAntwort } = await import('../web/src/components/detail/panel-antwort.ts')
const { antwortKopf } = await import('../web/src/components/detail/antwort-kopf.tsx')
const { translate } = await import('../web/src/lib/i18n.tsx')

const HEUTE = '2026-11-26'
let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const stream = (extra: Partial<WatchLink>): WatchLink => ({ name: 'X', url: 'https://x/1', kind: 'stream', zugang: 'abo', ...extra }) as WatchLink
const verweis = (extra: Partial<StreamLink>): StreamLink => ({ platform: 'netflix', url: 'https://netflix.com/title/1', zugang: 'abo', ...extra }) as StreamLink
const titel = (streams: StreamLink[], watchLinks: WatchLink[]): Title => ({ id: 1, slug: 'x', episodes: 12, format: 'TV', genres: [], keywords: [], dubConfidence: 'high', streams, watchLinks }) as unknown as Title
const termin = (extra: Partial<Release>): Release =>
  ({ slug: 'r', titleId: 1, platform: 'primevideo', releaseType: 'batch', schedule: { firstEpisodeDate: HEUTE }, ...extra }) as unknown as Release
const wege = (t: Title, rs: Release[] = []) => sichtbareWege(sortiereNachZugang({ title: t }), t, rs)
const namen = (t: Title, rs: Release[] = []) => wege(t, rs).flatMap((g) => [...g.plattformen.map((s) => s.platform + (s.kanal ? `(${s.kanal})` : '')), ...g.streamWege.map((w) => w.shop)])
const belegt = [{ from: 1, to: 12, dub: true }]

console.log('\nNur Untertitel ist nie eine Pille:')
const akibapass = stream({ name: 'Akibapass', url: 'https://akibapasstv.vhx.tv/products/the-most-heretical-last-boss-queen-omu-s1' })
pruefe('Bezugsweg mit „omu“ in der Adresse entfällt, die Gruppe gleich mit', wege(titel([], [akibapass])).length === 0, wege(titel([], [akibapass])))
pruefe('derselbe Anbieter ohne „omu“ in der Adresse bleibt', namen(titel([], [stream({ name: 'Akibapass', url: 'https://akibapasstv.vhx.tv/products/x-s1' })])).join() === 'Akibapass')
pruefe('Verweis mit Termin „nur OmU“ beim Anbieter entfällt', namen(titel([verweis({})], []), [termin({ platform: 'netflix', sprache: 'omu' })]).length === 0)
pruefe('Verweis mit belegtem Deutsch bleibt trotz OmU-Termin', namen(titel([verweis({ dub: true })], []), [termin({ platform: 'netflix', sprache: 'omu' })]).join() === 'netflix')
pruefe('Termin mit Sprache „omu“ steht nie, auch in der Zukunft', sichtbareTermine([termin({ sprache: 'omu', schedule: { firstEpisodeDate: '2026-12-24' } as Release['schedule'] })], []).length === 0)

console.log('\nGestrichen wird nur die Dublette, nie ein Weg ohne Widerlegung:')
const kanalWeg = stream({ name: 'Amazon Prime (Aniverse)', url: 'https://www.amazon.de/gp/video/detail/B0FBGJLZ4Y' })
pruefe('Bezugsweg über einen Prime-Kanal ohne Sprachbeleg bleibt (Weitere Anbieter)', namen(titel([], [kanalWeg])).join() === 'Amazon Prime (Aniverse)')
pruefe('Prime-Kanal-Verweis ohne Sprachbeleg bleibt', namen(titel([verweis({ platform: 'primevideo', kanal: 'aniverse' })], [])).join() === 'primevideo(aniverse)')
pruefe('Prime-Kanal-Verweis mit Beleg bleibt', namen(titel([verweis({ platform: 'primevideo', kanal: 'aniverse', dub: true })], [])).join() === 'primevideo(aniverse)')
pruefe('Anbieter ohne Kanal und ohne Beleg bleibt', namen(titel([verweis({})], [])).join() === 'netflix')
pruefe('Termin mit offener Sprache bleibt, am Starttag wie davor', sichtbareTermine([termin({ sprache: 'offen', kanal: 'Aniverse' }), termin({ sprache: 'offen', schedule: { firstEpisodeDate: '2026-11-01' } as Release['schedule'] })], []).length === 2)
pruefe('Fernsehtermin bleibt', sichtbareTermine([termin({ platform: 'tv', sprache: 'omu' })], []).length === 1)

console.log('\nEin Kanal, eine Pille — der belegte Weg gewinnt:')
const belegterBezug = { ...kanalWeg, dubRanges: belegt } as WatchLink
const verweisAniverse = (extra: Partial<StreamLink>) => verweis({ platform: 'primevideo', kanal: 'aniverse', url: 'https://www.amazon.de/gp/video/detail/B0B7D8FYH8', ...extra })
pruefe('beide belegt: der Verweis bleibt, der Bezugsweg entfällt', namen(titel([verweisAniverse({ dub: true })], [belegterBezug])).join() === 'primevideo(aniverse)', namen(titel([verweisAniverse({ dub: true })], [belegterBezug])))
pruefe('Verweis ohne Beleg, Bezugsweg belegt: der belegte Bezugsweg bleibt (Prüfer A1)', namen(titel([verweisAniverse({})], [belegterBezug])).join() === 'Amazon Prime (Aniverse)', namen(titel([verweisAniverse({})], [belegterBezug])))
pruefe('Verweis belegt, Bezugsweg ohne Beleg: der Verweis bleibt', namen(titel([verweisAniverse({ dub: true })], [kanalWeg])).join() === 'primevideo(aniverse)')
pruefe('beide ohne Beleg: eine Pille, der Verweis', namen(titel([verweisAniverse({})], [kanalWeg])).join() === 'primevideo(aniverse)')
pruefe('ein Verweis nur Untertitel schluckt den Bezugsweg nicht', namen(titel([verweisAniverse({ url: 'https://x/omu-s1' })], [kanalWeg])).join() === 'Amazon Prime (Aniverse)', namen(titel([verweisAniverse({ url: 'https://x/omu-s1' })], [kanalWeg])))
pruefe('Kanal in anderer Schreibweise (Hbo Max / HBO Max) ebenso', namen(titel([verweis({ platform: 'primevideo', kanal: 'HBO Max', dub: true })], [stream({ name: 'Amazon Prime (Hbo Max)', dubRanges: belegt } as Partial<WatchLink>)])).length === 1)
pruefe('Bezugsweg eines anderen Kanals bleibt', namen(titel([verweisAniverse({ dub: true })], [stream({ name: 'Amazon Prime (Crunchyroll)', dubRanges: belegt, url: 'https://x/cr' } as Partial<WatchLink>)])).length === 2)
pruefe('belegter Bezugsweg bleibt; sein Kanal-Termin entfällt', namen(titel([], [belegterBezug])).length === 1 && sichtbareTermine([termin({ kanal: 'Aniverse' })], wege(titel([], [belegterBezug]))).length === 0)
pruefe('Kanal-Termin ohne Weg desselben Kanals bleibt', sichtbareTermine([termin({ kanal: 'Aniverse' })], wege(titel([], []))).length === 1)

console.log('\nÜberschrift und leere Gruppen:')
const kaufweg = stream({ name: 'aniSearch', kind: 'buy', zugang: 'kauf', url: 'https://www.anisearch.de/article/1' } as Partial<WatchLink>)
const nurKauf = wege(titel([], [akibapass, kaufweg]))
pruefe('Abo-Gruppe entfällt, die Kauf-Gruppe behält ihre Überschrift', nurKauf.length === 1 && nurKauf[0].art === 'kauf' && nurKauf[0].zeigeUeberschrift === true, nurKauf.map((g) => [g.art, g.zeigeUeberschrift]))
const nurAbo = wege(titel([verweis({})], []))
pruefe('eine einzelne Abo-Gruppe trägt keine Überschrift', nurAbo.length === 1 && nurAbo[0].zeigeUeberschrift === false, nurAbo.map((g) => [g.art, g.zeigeUeberschrift]))
const zweiGruppen = wege(titel([verweis({}), verweis({ platform: 'youtube', url: 'https://youtube.com/x', zugang: 'kostenlos' })], []))
pruefe('zwei Gruppen tragen beide eine Überschrift', zweiGruppen.length === 2 && zweiGruppen.every((g) => g.zeigeUeberschrift), zweiGruppen.map((g) => [g.art, g.zeigeUeberschrift]))
pruefe('nur OmU: keine leere Gruppe bleibt zurück', wege(titel([verweis({ url: 'https://x/omu-s1' })], [akibapass])).every((g) => g.plattformen.length + g.shops.length + g.streamWege.length > 0))

console.log('\nEchte Panel-Verdrahtung (usePanelAntwort, Mini-DOM):')
const dom = installiereMiniDom({ ...attrappeUhr(), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({}))
const wurzel = createRoot(dom.wurzel as unknown as Element)
async function panel(title: Title, releases: Release[]) {
  let a: ReturnType<typeof usePanelAntwort> | undefined
  function Probe() {
    a = usePanelAntwort({ title, releases, today: HEUTE, synopsis: undefined, favorites: new Set(), verbindung: { verbunden: false } as never, t: translate })
    return null
  }
  await act(async () => wurzel.render(h(Probe)))
  return a!
}
const kopfText = (a: Awaited<ReturnType<typeof panel>>, title: Title, releases: Release[]) =>
  antwortKopf({
    antwort: { art: 'fertig', raus: 12, gesamt: 12, gesamtAbgeleitet: false, heuteOffen: true },
    T: translate as (k: string, v?: Record<string, string | number>) => string,
    relativImSatz: (d) => d,
    betont: (x) => x,
    ohneSprachbeleg: a.ohneSprachbeleg,
    releases,
    folgenZahl: undefined,
    deSeitNeben: '',
    title,
  }).haupt

/* Daniels Titel (156040): Akibapass nur Untertitel, Bezugsweg Aniverse ohne Beleg, Termin Aniverse „offen“, dazu der Kaufweg. */
const fall = titel([], [kanalWeg, akibapass, kaufweg])
const fallTermine = [termin({ titleId: 156040, kanal: 'Aniverse', sprache: 'offen' }), termin({ platform: 'netflix', sprache: 'omu' })]
const pFall = await panel(fall, fallTermine)
const inPillen = (a: typeof pFall) => a.sortiertNachZugang.flatMap((g) => g.streamWege.map((w) => w.shop))
pruefe('Panel: Akibapass (nur Untertitel) steht nicht als Pille', !inPillen(pFall).includes('Akibapass'), inPillen(pFall))
pruefe('Panel: der Aniverse-Weg ohne Beleg bleibt, einmal', inPillen(pFall).filter((s) => s === 'Amazon Prime (Aniverse)').length === 1, inPillen(pFall))
pruefe('Panel: kein OmU-Termin, kein zweiter Aniverse-Termin neben dem Weg', pFall.terminReleases.length === 0, pFall.terminReleases.map((r) => r.platform))
pruefe('Panel: der Kaufweg bleibt (Disc-Reiter)', pFall.sortiertNachZugang.some((g) => g.shops.length > 0))
pruefe('Panel-Kopf (fertig, heute) nennt die Sprache offen, nicht Deutsch', kopfText(pFall, fall, fallTermine) === 'Anbieter, Sprache offen', kopfText(pFall, fall, fallTermine))

/* Nur Untertitel: die Pille entfällt, der Kopf nennt es weiter („Anbieter, nur Untertitel“), er kippt nicht auf eine Deutsch-Aussage. */
const nurOmu = titel([], [akibapass])
const pOmu = await panel(nurOmu, [])
pruefe('Panel: nur Untertitel — keine Pille', pOmu.sortiertNachZugang.length === 0, pOmu.sortiertNachZugang.length)
pruefe('Panel-Kopf: nur Untertitel bleibt „nur Untertitel“', kopfText(pOmu, nurOmu, []) === 'Anbieter, nur Untertitel', kopfText(pOmu, nurOmu, []))

/* Ein belegter Prime-Kanal-Weg neben einem Verweis ohne Beleg: der Beleg bleibt bis in die Pillenliste. */
const pBeleg = await panel(titel([verweisAniverse({})], [belegterBezug]), [])
pruefe('Panel: belegter Bezugsweg bleibt (Verweis ohne Beleg entfällt)', JSON.stringify(pBeleg.sortiertNachZugang.flatMap((g) => g.streamWege.map((w) => w.shop))) === '["Amazon Prime (Aniverse)"]')
pruefe('Panel: der Kopf eines Titels mit belegtem Weg sagt nicht „Sprache offen“', pBeleg.ohneSprachbeleg !== true, pBeleg.ohneSprachbeleg)
pruefe('Panel: ein Titel ohne Wege bleibt ohne Kopf-Aussage', (await panel(titel([], []), [])).ohneSprachbeleg === false)

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
process.exit(0)
