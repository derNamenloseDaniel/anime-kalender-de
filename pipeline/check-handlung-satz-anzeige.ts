/**
 * Karte „Handlung“ im Detail-Panel (28.11.2026): Mit `satz` steht der Satz als Text, der Volltext erst nach dem Klick und keine
 * 200-Zeichen-Vorschau daneben; ohne `satz` bleibt alles wie vorher. Rendert `plotVon` → `HandlungAbschnitt`. Aufruf: `npm run check:logic`.
 */
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FranchiseMember } from '../shared/types.ts'
import type { Synopsis } from '../web/src/lib/data.ts'
import { ignoriereCss } from '../tools/mini-dom.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { HandlungAbschnitt } = await import('../web/src/components/detail/abschnitte.tsx')
const { plotVon } = await import('../web/src/components/detail/plot.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const ANFANG = 'Asta und Yuno wurden gemeinsam ausgesetzt und wachsen als Rivalen auf.'
const VOLL = `${ANFANG} ${'Beide wollen Magier-Kaiser werden und trainieren dafür jahrelang in verschiedenen Ritterorden. '.repeat(4)}ENDEVOLL`
const SATZ = 'Ein Junge ohne Magie will trotzdem Magier-Kaiser werden.'
const von = { id: 2, name: 'Staffel 1', al: 5 } as FranchiseMember

function karte(opts: { synopsis?: Synopsis; ersatz?: { plot: Synopsis; von: FranchiseMember }; offen: boolean }): string {
  const { plot } = plotVon({ synopsis: opts.synopsis, anilistId: 7, ersatz: opts.ersatz })
  return renderToStaticMarkup(h(HandlungAbschnitt, { plot, t: (k: string) => k, plotOffen: opts.offen, setPlotOffen: () => {} }))
}

const mit = karte({ synopsis: { de: VOLL, satz: SATZ }, offen: false })
pruefe('mit Satz, zu: der Satz steht da', mit.includes(SATZ), mit)
pruefe('mit Satz, zu: kein Volltext, keine Vorschau, kein „…“', !mit.includes('Asta und Yuno') && !mit.includes('ENDEVOLL') && !mit.includes('…'), mit)
pruefe('mit Satz, zu: der Aufklapper „detail.plotMore“ ist da', mit.includes('detail.plotMore') && mit.includes('aria-expanded="false"'), mit)

const offen = karte({ synopsis: { de: VOLL, satz: SATZ }, offen: true })
pruefe('mit Satz, offen: der Volltext steht da', offen.includes('ENDEVOLL'), offen)
pruefe('mit Satz, offen: der Satz steht nicht zusätzlich da', !offen.includes(SATZ), offen)

const kurz = karte({ synopsis: { de: ANFANG, satz: ANFANG }, offen: false })
pruefe('Satz gleich Text: kein Aufklapper', !kurz.includes('detail.plotMore'), kurz)

const ohne = karte({ synopsis: { de: VOLL }, offen: false })
pruefe('ohne Satz, zu: Vorschau mit „…“, kein Volltext', ohne.includes(' …') && !ohne.includes('ENDEVOLL') && ohne.includes('detail.plotMore'), ohne)
pruefe('ohne Satz, offen: Volltext', karte({ synopsis: { de: VOLL }, offen: true }).includes('ENDEVOLL'))
const kurzOhne = karte({ synopsis: { de: ANFANG }, offen: false })
pruefe('ohne Satz, kurzer Text: ganz, ohne Aufklapper', kurzOhne.includes(ANFANG) && !kurzOhne.includes('detail.plotMore'), kurzOhne)

const ersatz = karte({ synopsis: undefined, ersatz: { plot: { de: VOLL, satz: SATZ }, von }, offen: false })
pruefe('Ersatz aus der Reihe: Satz des Teils, Hinweis auf den Teil bleibt', ersatz.includes(SATZ) && !ersatz.includes('ENDEVOLL') && ersatz.includes('detail.plotVonTeil'), ersatz)

const platzhalter = karte({ synopsis: { en: 'Sequel to X.', satz: 'Satz des Platzhalter-Titels.' }, ersatz: { plot: { de: VOLL, satz: SATZ }, von }, offen: false })
pruefe('Platzhalter-Text durch Ersatz ersetzt: der Satz gehört dem Ersatz', platzhalter.includes(SATZ) && !platzhalter.includes('Platzhalter-Titels'), platzhalter)

const englisch = karte({ synopsis: { en: `${'English plot. '.repeat(12)}ENDEEN`, satz: SATZ }, offen: false })
pruefe('nur Englisch mit Satz, zu: Satz ohne „nur Englisch“-Hinweis', englisch.includes(SATZ) && !englisch.includes('detail.plotOnlyEnglish'), englisch)
pruefe('nur Englisch mit Satz, offen: Hinweis „nur Englisch“', karte({ synopsis: { en: `${'English plot. '.repeat(12)}ENDEEN`, satz: SATZ }, offen: true }).includes('detail.plotOnlyEnglish'))

console.log(`check-handlung-satz-anzeige: ${verletzt === 0 ? 'alle Fälle grün' : `${verletzt} verletzt`}`)
process.exit(verletzt === 0 ? 0 : 1)
