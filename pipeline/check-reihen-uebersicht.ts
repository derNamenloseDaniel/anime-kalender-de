/**
 * Zusicherungen für die Reihen-Übersicht großer Reihen (Daniel, F148, 20.11.2026): eingeklappte Gruppen mit Zahl, offen nur die
 * Gruppe des geöffneten Titels, jede offene Gruppe eine waagerechte Spur mit Karussell-Covern. Kern ist „Zahl = Liste“:
 * live zählte der Kopf auch Teile hinter dem (inzwischen entfernten) Schalter. Gerendert wird das echte `ReihenListe` im Mini-DOM; Klicks laufen über die
 * echten Knöpfe. Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FranchiseMember, Title } from '../shared/types.ts'
import { ignoriereCss, installiereMiniDom, klicke, MiniKnoten } from '../tools/mini-dom.ts'

ignoriereCss()
const { useLang } = await import('../web/src/lib/i18n.tsx')
const { ReihenListe } = await import('../web/src/components/detail/reihen-liste.tsx')
const { gruppeVon, istGrosseReihe } = await import('../web/src/components/detail/reihen-uebersicht-regeln.ts')
const { reihenStand } = await import('../web/src/components/detail/reihen-karte.tsx')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const gleich = (name: string, ist: unknown, soll: unknown) => pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), ist)
const { t } = useLang()

const teil = (id: number, name: string, mehr: Partial<FranchiseMember> = {}): FranchiseMember =>
  ({ id, name, format: 'TV', jpYear: 2000, episodes: 12, ...mehr }) as FranchiseMember
const film = (n: number, mehr: Partial<FranchiseMember> = {}) => teil(900200 + n, `Reihe: Film ${n}`, { format: 'MOVIE', episodes: 1, jpYear: 2000 + n, ...mehr })
const filme = (anzahl: number, ohne: number[] = []) => Array.from({ length: anzahl }, (_, i) => film(i + 1, ohne.includes(i + 1) ? { ohneSynchro: true } : {}))

/* Große Reihe: 3 Staffeln, 15 Filme (14 und 15 ohne Synchro), 4 Specials (eins ohne Synchro). Alle 22 stehen da: 3 + 15 + 4. */
const GROSS: FranchiseMember[] = [
  teil(900101, 'Reihe', { jpYear: 1999, cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx900101.jpg' }),
  teil(900102, 'Reihe Staffel 2', { jpYear: 2003 }),
  teil(900103, 'Reihe Staffel 3', { jpYear: 2007 }),
  ...filme(15, [14, 15]),
  teil(900301, 'Reihe Special 1', { format: 'OVA', episodes: 1, jpYear: 2001 }),
  teil(900302, 'Reihe Special 2', { format: 'OVA', episodes: 1, jpYear: 2002 }),
  teil(900303, 'Reihe Special 3', { format: 'OVA', episodes: 1, jpYear: 2004 }),
  teil(900304, 'Reihe Special 4', { format: 'OVA', episodes: 1, jpYear: 2005, ohneSynchro: true }),
]

/* Regeln: Größe hängt an der größten Gruppe, Teile ohne Synchro zählen mit. */
const gruppen = (anzahl: number, ohne: number[] = []) => [{ titel: 'Filme', teile: filme(anzahl, ohne) }]
pruefe('12 Filme: keine große Reihe', !istGrosseReihe(gruppen(12)))
pruefe('13 Filme: große Reihe', istGrosseReihe(gruppen(13)))
pruefe('13 Filme, einer ohne Synchro: große Reihe', istGrosseReihe(gruppen(13, [13])))
pruefe('12 Filme, einer ohne Synchro: keine große Reihe', !istGrosseReihe(gruppen(12, [12])))
gleich('Gruppe des Teils', gruppeVon([{ titel: 'A', teile: filme(2) }, { titel: 'B', teile: [teil(900301, 'x')] }], 900301), 'B')
gleich('Teil in keiner Gruppe', gruppeVon([{ titel: 'A', teile: filme(2) }], 900999), undefined)

/* Die Spur sucht beim Öffnen die gewählte Karte; das Mini-DOM kennt `querySelector` nicht (nur `[aria-selected="true"]` gebraucht). */
Object.assign(MiniKnoten.prototype, {
  querySelector(this: MiniKnoten) {
    return this.finde((k) => k.attribute.get('aria-selected') === 'true')[0] ?? null
  },
})

/* Auch die Messung der Spur braucht Frame-Aufrufe; ohne Layout im Mini-DOM laufen sie ins Leere. */
Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} })

type Stand = { titel: number; suche?: string; gemerkt?: number[]; wechselt?: boolean }
const aufrufe = { wechsel: [] as number[], suche: [] as unknown[] }
function props(teile: FranchiseMember[], s: Stand) {
  return {
    reihenTeile: teile,
    t,
    reihenName: 'Reihe',
    title: { id: s.titel } as Title,
    favorites: new Set<number>(s.gemerkt ?? []),
    wechselt: s.wechselt ?? false,
    wechsleZu: (id: number) => void aufrufe.wechsel.push(id),
    reihenSchluessel: 1,
    reiheSuche: { reihe: 1, text: s.suche ?? '' },
    setReiheSuche: (v: unknown) => void aufrufe.suche.push(v),
  }
}

/* Erst statisch (läuft auch gegen die Spur, die im Mini-DOM nicht misst): Kopfzahl = alle 22 Teile. */
const statisch = renderToStaticMarkup(h(ReihenListe, props(GROSS, { titel: 900102 })))
gleich('statisch: Kopfzahl 22 (3 + 15 + 4, auch Teile ohne Synchro)', /tabular-nums text-ak-text">(\d+)</.exec(statisch)?.[1], '22')
pruefe('statisch: große Reihe als Übersicht', statisch.includes('data-reihe-uebersicht'))
pruefe('statisch: Hauptserie von Anfang an offen, Filme zu', statisch.includes('data-reihe-teil="900102"') && !statisch.includes('data-reihe-teil="900201"'))
if (!statisch.includes('data-reihe-uebersicht')) {
  console.error(`\n${verletzt} Prüfung(en) verletzt (keine Übersicht, Rest übersprungen)`)
  process.exit(1)
}

const klasse = (k: MiniKnoten) => k.attribute.get('class') ?? ''
async function oeffne(teile: FranchiseMember[], s: Stand) {
  const dom = installiereMiniDom(
    { setTimeout: () => 0, clearTimeout: () => {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) },
    () => ({ src: '', srcset: '', sizes: '', decode: () => Promise.resolve() }),
  )
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  const zeige = (st: Stand) => act(async () => wurzel.render(h(ReihenListe, props(teile, st))))
  await zeige(s)
  const gruppenKnoten = () => dom.wurzel.finde((k) => k.attribute.has('data-reihe-gruppe'))
  const lage = () => {
    const kopfZahl = dom.wurzel.finde((k) => klasse(k).includes('rounded-full') && klasse(k).includes('tabular-nums'))[0]?.textContent
    const gruppe = gruppenKnoten().map((g) => {
      const kopf = g.finde((k) => k.attribute.has('aria-expanded'))[0]!
      const ziel = dom.wurzel.finde((k) => k.attribute.get('id') === kopf.attribute.get('aria-controls'))
      return {
        titel: g.attribute.get('data-reihe-gruppe'),
        zahl: Number(kopf.finde((k) => klasse(k).includes('tabular-nums'))[0]?.textContent),
        offen: kopf.attribute.get('aria-expanded') === 'true',
        ziel: ziel.length === 1 && g.contains(ziel[0]!),
        zeilen: g.finde((k) => k.attribute.has('data-reihe-teil')).map((k) => Number(k.attribute.get('data-reihe-teil')) - 900200),
      }
    })
    const stand = dom.wurzel.finde((k) => klasse(k).includes('pl-[38px]'))[0]?.textContent ?? null
    return { kopfZahl: kopfZahl === undefined ? null : Number(kopfZahl), gruppe, stand, spuren: dom.wurzel.finde((k) => k.attribute.get('role') === 'tablist').length, uebersicht: dom.wurzel.finde((k) => k.attribute.has('data-reihe-uebersicht')).length === 1 }
  }
  const zeile = (id: number) => {
    const li = dom.wurzel.finde((k) => k.attribute.get('data-reihe-teil') === String(id))[0]
    if (!li) return null
    const knopf = li as MiniKnoten & { disabled?: boolean }
    return {
      aktuell: knopf.attribute.get('aria-selected') ?? null,
      aus: knopf.attribute.has('disabled') || knopf.disabled === true,
      stern: (li.textContent ?? '').includes('★'),
      bild: li.finde((k) => k.localName === 'img').length,
      name: klasse(li.finde((k) => klasse(k).includes('line-clamp-2'))[0]!),
      angaben: li.finde((k) => klasse(k).includes('truncate'))[0]?.textContent ?? null,
      knopf: klasse(knopf).split(' '),
      huelle: klasse(li.finde((k) => klasse(k).includes('aspect-[2/3]'))[0]!).split(' '),
      img: ['src', 'width', 'height', 'sizes'].map((n) => li.finde((k) => k.localName === 'img')[0]?.attribute.get(n) ?? null),
    }
  }
  const schalter = () => dom.wurzel.finde((k) => k.localName === 'input' && k.attribute.get('type') === 'checkbox').length
  /* Handler direkt über die React-Props des Knotens: das Mini-DOM kennt kein `change`-Ereignis. */
  const handler = (k: MiniKnoten) => Object.entries(k).find(([s]) => s.startsWith('__reactProps'))?.[1] as { onChange: (e: unknown) => void }
  const suchfeld = () => dom.wurzel.finde((k) => k.localName === 'input' && k.attribute.has('placeholder'))[0]! as MiniKnoten & { value?: string }
  const kopfVon = (titel: string) => gruppenKnoten().find((g) => g.attribute.get('data-reihe-gruppe') === titel)!.finde((k) => k.attribute.has('aria-expanded'))[0]!
  return {
    lage,
    zeige,
    text: () => dom.wurzel.textContent,
    klickeGruppe: (titel: string) => act(async () => klicke(dom.wurzel, kopfVon(titel))),
    klickeTeil: (id: number) =>
      act(async () => klicke(dom.wurzel, dom.wurzel.finde((k) => k.attribute.get('data-reihe-teil') === String(id))[0]!)),
    zeile,
    schalter,
    sucheWert: () => suchfeld().value ?? '',
    tippe: (text: string) => act(async () => handler(suchfeld()).onChange({ target: { value: text } })),
    ende: async () => {
      await act(async () => wurzel.unmount())
      dom.entferne()
    },
  }
}

/** Zahl = Liste: Kopfzahl = Summe der Gruppenzahlen; jede offene Gruppe zeigt so viele Karten. */
function zahlGleichListe(fall: string, l: Awaited<ReturnType<Awaited<ReturnType<typeof oeffne>>['lage']>>) {
  gleich(`${fall}: Kopfzahl = Summe der Gruppen`, l.kopfZahl, l.gruppe.reduce((s, g) => s + g.zahl, 0))
  for (const g of l.gruppe) {
    pruefe(`${fall}: ${g.titel} — aria-controls zeigt auf den eigenen Bereich`, g.ziel)
    if (!g.offen) gleich(`${fall}: ${g.titel} zu — keine Zeile`, g.zeilen.length, 0)
    else gleich(`${fall}: ${g.titel} offen — Karten = Zahl`, g.zeilen.length, g.zahl)
  }
}
const kurz = (l: Awaited<ReturnType<Awaited<ReturnType<typeof oeffne>>['lage']>>) => l.gruppe.map((g) => [g.titel, g.zahl, g.offen ? g.zeilen.length : '-'])

/* Staffel geöffnet: nur die Hauptserie offen; der Kopf zählt alle 22 Teile. */
const a = await oeffne(GROSS, { titel: 900102 })
pruefe('große Reihe: Übersicht statt Spur', a.lage().uebersicht)
gleich('Staffel geöffnet: Gruppen, Zahlen, offene Zeilen', kurz(a.lage()), [['Hauptserie', 3, 3], ['Filme', 15, '-'], ['Specials & OVAs', 4, '-']])
gleich('Staffel geöffnet: Kopf zählt alle 22', a.lage().kopfZahl, 22)
zahlGleichListe('Staffel geöffnet', a.lage())
gleich('Staffel geöffnet: Stand über der Liste', a.lage().stand, 'Staffel 2 von 3')
gleich('Karte des geöffneten Teils: gewählt, fett', [a.zeile(900102)?.aktuell, a.zeile(900102)?.name.includes('font-semibold')], ['true', true])
gleich('andere Karte: nicht gewählt, normal, nicht blass', [a.zeile(900101)?.aktuell, a.zeile(900101)?.name.includes('font-medium'), a.zeile(900101)?.name.includes('opacity-75')], ['false', true, false])
gleich('Angaben der ersten Staffel', a.zeile(900101)?.angaben, '1999 · 12 Fg.')
gleich('Cover nur, wo eines da ist; ohne Stern und frei', [a.zeile(900101)?.bild, a.zeile(900102)?.bild, a.zeile(900101)?.stern, a.zeile(900101)?.aus], [1, 0, false, false])
const knopfMerkmale = (id: number) => ['cursor-default', 'cursor-pointer'].map((c) => a.zeile(id)?.knopf.includes(c))
gleich('Karte: gewählter Teil ruhig, anderer klickbar', [knopfMerkmale(900102), knopfMerkmale(900101)], [[true, false], [false, true]])
gleich('Cover der ersten Staffel: Karussell-Größe 120 × 180', a.zeile(900101)?.img.slice(1), ['120', '180', '120px'])
gleich('Cover-Hülle einer erschienenen Karte mit Synchro: weder blass noch gestrichelt', ['opacity-55', 'outline-dashed'].map((c) => a.zeile(900101)?.huelle.includes(c)), [false, false])
pruefe('Karten stehen in einer waagerechten Spur', a.lage().spuren === 1, a.lage().spuren)
gleich('kein Schalter „ohne Synchro“ mehr', a.schalter(), 0)
pruefe('kein Wechsel: kein Ladehinweis', !(a.text() ?? '').includes('Wird geladen'))
await a.klickeGruppe('Filme')
gleich('Filme aufgeklappt: alle 15 Karten', a.lage().gruppe[1]!.zeilen.length, 15)
zahlGleichListe('Filme aufgeklappt', a.lage())
await a.klickeGruppe('Hauptserie')
gleich('Hauptserie zugeklappt', a.lage().gruppe[0]!.offen, false)
zahlGleichListe('Hauptserie zugeklappt', a.lage())
gleich('3 + 15 + 4, Kopf 22', [kurz(a.lage()).map((g) => g[1]), a.lage().kopfZahl], [[3, 15, 4], 22])
gleich('Film 14 ohne Synchro blass, Film 1 nicht', [a.zeile(900214)?.name.includes('opacity-75'), a.zeile(900201)?.name.includes('opacity-75')], [true, false])
gleich('Cover von Film 14 blass, nicht gestrichelt', ['opacity-55', 'outline-dashed'].map((c) => a.zeile(900214)?.huelle.includes(c)), [true, false])
await a.zeige({ titel: 900207 })
gleich('Wechsel auf Film 7: Filme bleibt offen, Hauptserie bleibt zu', a.lage().gruppe.map((g) => g.offen), [false, true, false])
await a.ende()

/* Film geöffnet: nur Filme offen, alle 15 Karten in einer Spur; Klick auf den geöffneten Film tut nichts. */
const b = await oeffne(GROSS, { titel: 900207 })
gleich('Film 7: nur Filme offen', b.lage().gruppe.map((g) => g.offen), [false, true, false])
gleich('Film 7: alle 15 Karten, kein Fenster', b.lage().gruppe[1]!.zeilen.length, 15)
gleich('Film geöffnet: kein Staffelstand', b.lage().stand, null)
await b.klickeTeil(900208)
await b.klickeTeil(900207)
gleich('Klick auf Film 8 wechselt, der geöffnete Film 7 tut nichts', aufrufe.wechsel, [900208])
zahlGleichListe('Film 7', b.lage())
await b.ende()

/* Ein Teil ohne Synchro ist geöffnet: alle Filme stehen da. */
const e = await oeffne(GROSS, { titel: 900214 })
gleich('Film 14 ohne Synchro geöffnet: Filme 15, alle 15 Karten', [e.lage().gruppe[1]!.zahl, e.lage().gruppe[1]!.zeilen.length], [15, 15])
zahlGleichListe('Film 14 geöffnet', e.lage())
await e.ende()

/* Suche: alle Treffer, alle Gruppen offen, kein Fenster. */
const f = await oeffne(GROSS, { titel: 900207, suche: 'film 1' })
gleich('Suche „film 1“: nur Filme, 1 und 10–15', [kurz(f.lage()), f.lage().gruppe[0]?.zeilen], [[['Filme', 7, 7]], [1, 10, 11, 12, 13, 14, 15]])
zahlGleichListe('Suche', f.lage())
gleich('Suche: Feld zeigt den Suchtext', f.sucheWert(), 'film 1')
await f.tippe('abc')
gleich('Tippen: setzt die Suche der Reihe', aufrufe.suche, [{ reihe: 1, text: 'abc' }])
await f.zeige({ titel: 900207, suche: '   ' })
gleich('nur Leerzeichen: keine Suche, Feld leer', [f.sucheWert(), f.lage().gruppe.map((g) => g.offen)], ['', [false, true, false]])
await f.zeige({ titel: 900207, suche: 'zzzz' })
gleich('Suche ohne Treffer: keine Gruppe, keine Kopfzahl', [f.lage().gruppe.length, f.lage().kopfZahl], [0, null])
pruefe('Suche ohne Treffer: Hinweis', (f.text() ?? '').includes('Kein Teil passt'))
await f.ende()

/* Suche mit mehr als 12 Treffern in der Gruppe des geöffneten Films: alle Treffer. */
const g2 = await oeffne(GROSS, { titel: 900207, suche: 'film' })
gleich('Suche „film“: 15 Karten', kurz(g2.lage()), [['Filme', 15, 15]])
zahlGleichListe('Suche über 12', g2.lage())
await g2.ende()

/* Gruppe des geöffneten Teils mit 13 Teilen, einer davon ohne Synchro: alle 13 Karten. */
const special = (i: number) => teil(900300 + i, `Reihe Special ${i}`, { format: 'OVA', episodes: 1, jpYear: 2000 + i, ...(i === 13 ? { ohneSynchro: true } : {}) })
const GROSS2 = [teil(900101, 'Reihe'), ...filme(13), ...Array.from({ length: 13 }, (_, i) => special(i + 1))]
const g3 = await oeffne(GROSS2, { titel: 900305 })
gleich('13 Specials, Special 5 geöffnet: 13 Karten', [g3.lage().gruppe[2]?.zahl, g3.lage().gruppe[2]?.zeilen.length], [13, 13])
await g3.ende()

/* Wechsel auf einen Teil einer zugeklappten Gruppe (auch: Gruppe ändert sich beim Nachladen): offen ist nur seine Gruppe (F148). */
const w = await oeffne(GROSS, { titel: 900102 })
await w.zeige({ titel: 900207 })
gleich('Wechsel ohne Klick: nur Filme offen, Hauptserie geht zu', w.lage().gruppe.map((g) => g.offen), [false, true, false])
await w.ende()

/* Wechsel läuft: Ladehinweis, Zeilen gesperrt; ein gemerkter Teil trägt den Stern. */
const l = await oeffne(GROSS, { titel: 900102, wechselt: true, gemerkt: [900101] })
pruefe('Wechsel läuft: „Wird geladen …“', (l.text() ?? '').includes('Wird geladen'))
gleich('Wechsel läuft: Karten gesperrt; Stern nur am gemerkten Teil', [l.zeile(900101)?.aus, l.zeile(900101)?.stern, l.zeile(900103)?.stern], [true, true, false])
await l.ende()

/* Staffelstand ohne geöffnete Hauptstaffel (Spur-Untertitel): Einzahl, Mehrzahl, ohne Staffeln leer. */
gleich('Stand: eine Staffel', reihenStand([teil(900101, 'Reihe'), film(1)], 'Reihe', 900201, t), '1 Staffel')
gleich('Stand: drei Staffeln', reihenStand(GROSS, 'Reihe', 900201, t), '3 Staffeln')
gleich('Stand: nur Filme, leer', reihenStand(filme(2), 'Reihe', 900201, t), '')

/* Kleine Reihe (12 Filme) bleibt Spur — Gegenprobe zur Grenze; die Spur misst im Browser, darum hier statisch. */
const klein = renderToStaticMarkup(h(ReihenListe, props([teil(900101, 'Reihe'), ...filme(12)], { titel: 900101 })))
pruefe('12 Filme: Spur, keine Übersicht', klein.includes('role="tab"') && !klein.includes('data-reihe-uebersicht'))
/* Spur-Kopf: zählt die gezeigten Zeilen — fünf Teile, drei ohne Synchro: Kopf 5; Suchtext „Film 4“ 1 (Befund 21.11.2026: Noragami Kopf 5, Liste 2). */
const kopfSpur = (s: Stand) => /tabular-nums text-ak-text">(\d+)</.exec(renderToStaticMarkup(h(ReihenListe, props([teil(900101, 'Reihe'), ...filme(4, [2, 3, 4])], s))))?.[1]
gleich('Spur-Kopf: alle 5 Teile, auch ohne Synchro', kopfSpur({ titel: 900101 }), '5')
gleich('Spur-Kopf mit Suchtext: Treffer', kopfSpur({ titel: 900101, suche: 'Film 4' }), '1')
const kleinLaedt = renderToStaticMarkup(h(ReihenListe, props([teil(900101, 'Reihe'), ...filme(12)], { titel: 900101, wechselt: true })))
gleich('Spur: Ladehinweis nur während des Wechsels', [klein.includes('Wird geladen'), kleinLaedt.includes('Wird geladen')], [false, true])

if (verletzt > 0) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\ncheck-reihen-uebersicht: Grenze 12, Zahl = Liste (Kopf, Gruppen, Suche), Aufklappen, Spur je offene Gruppe, Grenze genau 12, Stand, Zeilen, Laden und Suche ✓')
