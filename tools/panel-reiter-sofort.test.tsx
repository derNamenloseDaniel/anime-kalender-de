// Zusicherung (Daniel, 28.11.2026: Reiter „3.2“ tat Sekunden lang nichts): Ein Reiterklick öffnet den Titel im selben Zug, auch wenn
// er nicht im Bestand steht; das Panel zeigt dann Platzhalter mit markiertem Reiter statt „keine Metadaten“.
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import { ignoriereCss } from './mini-dom.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { useReihenWechsel } = await import('../web/src/components/detail/panel-laden.ts')
const { PanelLeer } = await import('../web/src/components/detail/panel-huellen.tsx')
const { PanelPlatzhalter } = await import('../web/src/components/detail/panel-platzhalter.tsx')

/* 1. wechsleZu ruft onOpenTitle synchron — auch für eine Kennung, die niemand kennt. */
const geoeffnet: number[] = []
const { wechsleZu } = useReihenWechsel(1, (id) => geoeffnet.push(id))
wechsleZu(999_999)
assert.deepEqual(geoeffnet, [999_999], 'unbekannte Kennung: sofort geöffnet, nicht erst nach dem Laden')
wechsleZu(1)
assert.deepEqual(geoeffnet, [999_999], 'der offene Titel öffnet sich nicht noch einmal')

/* 2. Platzhalter statt „keine Metadaten“, solange geladen wird; der gewählte Reiter ist markiert. */
const t = (k: string) => (k === 'detail.noMeta' ? 'Zu diesem Eintrag liegen keine Metadaten vor.' : k === 'detail.seasonLoading' ? 'Wird geladen …' : k)
const reiter = [1, 2, 3].map((id) => ({ id, label: `${id}`, name: `Staffel ${id}`, ohneSynchro: false }))
const platzhalter = h(PanelPlatzhalter, { titleId: 3, reiter, mitglied: undefined, t, wechsleZu: () => {} })
const laedt = renderToStaticMarkup(h(PanelLeer, { holt: true, t, onClose: () => {}, platzhalter }))
assert.ok(laedt.includes('data-panel-platzhalter'), 'lädt: Platzhalter steht')
assert.ok(!laedt.includes('keine Metadaten'), 'lädt: nie „keine Metadaten“')
assert.ok(/id="reihe-3-reiter-3"[^>]*aria-selected="true"|aria-selected="true"[^>]*id="reihe-3-reiter-3"/.test(laedt), 'lädt: gewählter Reiter markiert')
assert.ok(laedt.includes('Staffel 3'), 'lädt: Name des gewählten Teils aus der Reihe')
assert.ok(laedt.includes('motion-reduce:animate-none'), 'Platzhalter respektiert reduzierte Bewegung')

const fertig = renderToStaticMarkup(h(PanelLeer, { holt: false, t, onClose: () => {}, platzhalter }))
assert.ok(fertig.includes('keine Metadaten') && !fertig.includes('data-panel-platzhalter'), 'geladen und nicht gefunden: erst dann „keine Metadaten“')

/* 3. Reiter eines anderen Titels (gewählter Teil nicht dabei) werden nicht gezeigt. */
const fremd = renderToStaticMarkup(h(PanelPlatzhalter, { titleId: 77, reiter, mitglied: undefined, t, wechsleZu: () => {} }))
assert.ok(!fremd.includes('role="tablist"'), 'fremde Reiter: keine Leiste')

console.log('panel-reiter-sofort: ok')
process.exit(0)
