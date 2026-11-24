/**
 * Verdrahtung der Quellenzeile unter der Handlung im Detail-Panel (24.11.2026, The Mighty Nein): `usePanelSynopse` (Cartoon, negative Kennung)
 * → `plotVon` → `HandlungAbschnitt`. Cartoon mit `tmdbId` zeigt „Quelle: TMDB" mit der Seite des Titels, ohne `tmdbId` keine Quellenzeile.
 * Mini-DOM wie `check-aktive-chips.ts`. Aufruf: `npm run check:logic`.
 */
import { act, createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Title } from '../shared/types.ts'
import { attrappeUhr, ignoriereCss, installiereMiniDom } from '../tools/mini-dom.ts'
ignoriereCss()
await import('../web/src/lib/i18n-spaet.ts')
const { usePanelSynopse } = await import('../web/src/components/detail/panel-synopse.ts')
const { HandlungAbschnitt } = await import('../web/src/components/detail/abschnitte.tsx')
const { plotVon } = await import('../web/src/components/detail/plot.ts')

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const uhr = attrappeUhr()
const dom = installiereMiniDom({ ...uhr, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, () => ({}))

/** Rendert das Panel-Stück für einen Cartoon: der Haken liefert die Handlung, der Abschnitt zeigt sie (statisch, `t` gibt den Schlüssel zurück). */
async function abschnittFuer(titel: Partial<Title>): Promise<string> {
  let gesehen: ReturnType<typeof usePanelSynopse> | undefined
  const Sonde = () => {
    gesehen = usePanelSynopse(titel.id!, titel as Title)
    return null
  }
  const wurzel = createRoot(dom.wurzel as unknown as Element)
  await act(async () => wurzel.render(h(Sonde)))
  await act(async () => wurzel.unmount())
  const { plot } = plotVon({ synopsis: gesehen!.synopsis, anilistId: undefined, ersatz: undefined })
  return renderToStaticMarkup(h(HandlungAbschnitt, { plot, t: (k: string) => k, plotOffen: false, setPlotOffen: () => {} }))
}

const mit = await abschnittFuer({ id: -219080, synopsis: 'Ein Text aus TMDB.', tmdbId: 219080 })
pruefe('Cartoon mit tmdbId: die Handlung steht da', mit.includes('Ein Text aus TMDB.'), mit)
pruefe('Cartoon mit tmdbId: Quellenzeile verlinkt die TMDB-Seite des Titels', mit.includes('href="https://www.themoviedb.org/tv/219080"'), mit)
pruefe('Cartoon mit tmdbId: Anbieter heißt TMDB, nicht aniSearch', mit.includes('>TMDB ↗<') && !/aniSearch|anisearch/.test(mit), mit)

const ohne = await abschnittFuer({ id: -5, synopsis: 'Ein Text ohne Herkunft.' })
pruefe('Cartoon ohne tmdbId: die Handlung steht trotzdem da', ohne.includes('Ein Text ohne Herkunft.'), ohne)
pruefe('Cartoon ohne tmdbId: keine Quellenzeile, kein Link', !ohne.includes('detail.plotQuelle') && !ohne.includes('<a '), ohne)

if (verletzt) process.exit(1)
