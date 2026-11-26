/**
 * Zusicherung (PR 5077, Auflagen A1/A6): Ein `Tooltip` um ein Eingabefeld (`<label>` mit `<input>`) schluckt den ersten Tipp
 * auf dem Handy nicht (sonst bekommt das Feld „Gesehen bis“ keinen Fokus); um reinen Text schluckt er ihn weiter. Escape
 * schließt die Blase (`Tooltip` und `useFlaechenHinweis`), und die Fläche räumt beim Abbau ihre Zeitgeber auf.
 * Feste Kulisse, keine echte Uhr. Aufruf: npx tsx pipeline/check-tooltip-bedienung.ts (läuft in `check:logic`).
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { attrappeUhr, ignoriereCss, installiereMiniDom, loese, type MiniKnoten } from '../tools/mini-dom.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

ignoriereCss()
const { useEscape } = await import('../web/src/lib/escape.ts')
const { Tooltip, kindIstBedienbar } = await import('../web/src/components/ui.tsx')
const { useFlaechenHinweis } = await import('../web/src/components/hinweis-flaeche.tsx')

const uhr = attrappeUhr()
const dom = installiereMiniDom(
  { ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), innerWidth: 400, innerHeight: 800, getComputedStyle: () => ({}) } as never,
  () => ({}),
)
/* `window` mit echten Hörern (das Mini-DOM lässt sie ins Leere laufen); `useEscape` hängt dort. */
const fensterHoerer: { f: (e: unknown) => void; capture: boolean }[] = []
const fenster = (globalThis as unknown as { window: Record<string, unknown> }).window
fenster.addEventListener = (t: string, f: (e: unknown) => void, o?: boolean) => void (t === 'keydown' && fensterHoerer.push({ f, capture: o === true }))
fenster.removeEventListener = (t: string, f: (e: unknown) => void, o?: boolean) => {
  const i = fensterHoerer.findIndex((x) => x.f === f && x.capture === (o === true))
  if (t === 'keydown' && i >= 0) fensterHoerer.splice(i, 1)
}
Object.assign(globalThis, { requestAnimationFrame: () => 0, cancelAnimationFrame() {} })
const art = Object.getPrototypeOf(dom.wurzel) as MiniKnoten
Object.assign(art, {
  closest(this: MiniKnoten, wahl: string) {
    const name = wahl.replace(/\[.*$/, '')
    for (let k: MiniKnoten | null = this; k; k = k.parentNode) if ((name && k.localName === name) || (wahl.startsWith('[data-hinweis') && k.hasAttribute('data-hinweis'))) return k
    return null
  },
  matches: () => true,
  getBoundingClientRect: () => ({ left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 }),
  dataset: undefined,
})
const wurzel = createRoot(dom.wurzel as unknown as Element)
const zeige = (baum: unknown) => act(async () => wurzel.render(baum as never))
const blasen = () => (document.body as unknown as MiniKnoten).finde((k) => k.getAttribute('role') === 'tooltip').length
const tip = (props: object, kind: unknown) => h(Tooltip as never, props as never, kind as never)
const hebeAb = (typ: string, ziel: MiniKnoten, mehr?: object) => act(async () => void loese(dom.wurzel, typ, ziel, mehr))
/** Escape wie im Browser (Blasenphase am window; `defaultPrevented` wie in `haengeEscape`). */
const drueckeEscape = () =>
  act(async () => {
    const e = { key: 'Escape', defaultPrevented: false, preventDefault() { this.defaultPrevented = true } }
    for (const x of [...fensterHoerer]) x.f(e)
  })

/** Touch-Tipp wie der Browser: touchstart, dann der Klick; gibt zurück, ob der Klick verhindert wurde. */
async function tippe(ziel: MiniKnoten): Promise<boolean> {
  await hebeAb('touchstart', ziel)
  let verhindert = false
  await act(async () => void (verhindert = loese(dom.wurzel, 'click', ziel)))
  return verhindert
}

await zeige(tip({ text: 'Hinweis', ohneTabHalt: true }, h('label', null, h('span', null, 'Gesehen bis'), h('input', { type: 'number' }))))
const feld = dom.wurzel.finde((k) => k.localName === 'input')[0]!
pruefe('Feld in <label>: Tipp wird nicht verhindert (Feld bekommt Fokus)', (await tippe(feld)) === false)

await zeige(tip({ text: 'Hinweis' }, h('span', null, 'Text')))
const text = dom.wurzel.finde((k) => k.localName === 'span' && k.textContent === 'Text')[0]!
pruefe('Text: erster Tipp zeigt die Blase und wird verhindert', (await tippe(text)) === true)

pruefe('kindIstBedienbar: Knopf, Feld, tabIndex, label mit Feld', [h('button'), h('input'), h('select'), h('textarea'), h('span', { tabIndex: 0 }), h('label', null, h('input'))].every(kindIstBedienbar))
pruefe('kindIstBedienbar: Text, span, label ohne Feld', ![h('span', null, h('button')), h('label', null, 'x'), 'Text'].some(kindIstBedienbar))

/* Escape: Maus öffnet die Blase, die Taste schließt sie. */
await zeige(tip({ text: 'Hinweis' }, h('span', null, 'Text')))
const anker = dom.wurzel.finde((k) => k.localName === 'span' && k.textContent === 'Text')[0]!
await hebeAb('mouseover', anker)
const huelle = dom.wurzel.finde((k) => k.hoerer.has('mouseenter') || k.getAttribute('class')?.includes('relative') === true)[0]
await act(async () => void huelle?.hoerer.get('mouseenter')?.forEach((x) => x.f({ target: anker })))
const vorher = blasen()
await drueckeEscape()
pruefe('Escape schließt die offene Blase des Tooltip', vorher > 0 && blasen() === 0, { vorher, nachher: blasen() })

/* Ein Zeiger, der gleich nach einem Escape wieder über dem Auslöser liegt (Fenster zu), öffnet keine Blase, die das nächste Escape fräße. */
await act(async () => void huelle?.hoerer.get('mouseenter')?.forEach((x) => x.f({ target: anker })))
pruefe('Zeiger unmittelbar nach Escape öffnet keine Blase', blasen() === 0, blasen())
await new Promise((fertig) => setTimeout(fertig, 350))

/* Blase über einem Dialog: das erste Escape schließt nur die Blase (WCAG 1.4.13), das zweite den Dialog. */
let dialogZu = 0
function Dialog() {
  useEscape(true, () => void dialogZu++)
  return h('div', { role: 'dialog' }, tip({ text: 'Hinweis' }, h('span', null, 'Im Dialog')))
}
await zeige(h(Dialog))
const imDialog = dom.wurzel.finde((k) => k.localName === 'span' && k.textContent === 'Im Dialog')[0]!
await hebeAb('mouseover', imDialog)
const huelleDialog = dom.wurzel.finde((k) => k.hoerer.has('mouseenter') || k.getAttribute('class')?.includes('relative') === true)[0]
await act(async () => void huelleDialog?.hoerer.get('mouseenter')?.forEach((x) => x.f({ target: imDialog })))
const offenImDialog = blasen()
await drueckeEscape()
pruefe('Blase im Dialog: erstes Escape schließt nur die Blase', offenImDialog > 0 && blasen() === 0 && dialogZu === 0, { offenImDialog, blasen: blasen(), dialogZu })
await drueckeEscape()
pruefe('Blase im Dialog: zweites Escape schließt den Dialog', dialogZu === 1, dialogZu)

/* Fläche: Antippen setzt Zeitgeber, der Abbau räumt sie auf; Escape schließt. */
function Flaeche() {
  const { handler, blase } = useFlaechenHinweis()
  return h('div', handler as never, h('span', { 'data-hinweis': 'Text' }, 'Symbol'), blase)
}
await uhr.schiebe(5000, (f) => act(async () => f()))
await zeige(h(Flaeche))
const symbol = dom.wurzel.finde((k) => k.getAttribute('data-hinweis') === 'Text')[0]!
Object.assign(symbol, { dataset: { hinweis: 'Text' } })
await hebeAb('touchstart', symbol)
const zeitgeber = uhr.offen()
pruefe('Fläche: Antippen stellt Zeitgeber', zeitgeber > 0, zeitgeber)
await drueckeEscape()
pruefe('Fläche: Escape schließt die Blase', blasen() === 0, blasen())
await hebeAb('touchstart', symbol)
await act(async () => wurzel.unmount())
pruefe('Fläche: nach dem Abbau läuft kein Zeitgeber mehr', uhr.offen() === 0, uhr.offen())

dom.entferne()
if (verletzt > 0) {
  console.error(`✖ ${verletzt} Verletzung(en)`)
  process.exit(1)
}
console.log('check-tooltip-bedienung: ok')
