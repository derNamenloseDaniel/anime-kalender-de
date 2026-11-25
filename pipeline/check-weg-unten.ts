/**
 * Zusicherung zur Unterzeile einer Bezugsweg-Pille (`wegUnten` in `web/src/components/detail/wege-zeilen.tsx`):
 * Folge-Hinweis vor Folgenzahl aus Belegen, eine Zahl über den Verweis nur bei `dub: true`, sonst keine Unterzeile.
 * Gerendert wird `streamZeilen`. Aufruf: `npm run check:logic`.
 */
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Title, WatchLink } from '../shared/types.ts'
import { streamZeilen } from '../web/src/components/detail/wege-zeilen.tsx'
import { gruppiereKaufwege } from '../web/src/components/detail/pillen.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const deutsch = [{ from: 1, to: 12, dub: true }]
const weg = (url: string, extra: Partial<WatchLink>): WatchLink => ({ name: 'Videoload', url, kind: 'stream', zugang: 'kauf', ...extra })
const titel = (streams: unknown[]) => ({ id: 1, slug: 'x', format: 'TV', episodes: 12, streams, watchLinks: [] }) as unknown as Title

function pille(w: WatchLink, title: Title): string {
  const zeilen = streamZeilen({
    sortiertNachZugang: [{ plattformen: [], streamWege: gruppiereKaufwege([w]) }] as never,
    title,
    t: ((k: string, p?: { n?: number }) => (p?.n === undefined ? k : `${k}:${p.n}`)) as never,
    today: '2026-10-13',
    folgenAngabeFuer: (s) => `ZAHL(${s?.url})`,
    dubZeilen: () => [],
    releaseJePlattform: new Map(),
    streamReleases: [],
    releases: [],
    tvVorbei: [],
  })
  return renderToStaticMarkup(createElement(Fragment, null, ...zeilen))
}

console.log('\nUnterzeile eines Bezugswegs:')
const leer = titel([])
const nurFolge = pille(weg('https://x/a', { nurFolge: 7, dubRanges: deutsch }), leer)
pruefe('nurFolge: Folge-Hinweis statt Folgenzahl', nurFolge.includes('detail.nurFolge:7') && !nurFolge.includes('ZAHL('), nurFolge.slice(0, 300))
const nurFolge2 = pille(weg('https://x/b', { nurFolge: 3 }), leer)
pruefe('nurFolge ohne Ranges: Folge-Hinweis mit eigener Zahl', nurFolge2.includes('detail.nurFolge:3'), nurFolge2.slice(0, 300))
const beleg = pille(weg('https://x/c', { dubRanges: deutsch }), leer)
pruefe('Beleg mit Ranges: Folgenzahl der Adresse', beleg.includes('ZAHL(https://x/c)'), beleg.slice(0, 300))
const verweisJa = pille(weg('https://x/d', {}), titel([{ platform: 'netflix', url: 'https://x/d', dub: true }]))
pruefe('Verweis mit dub: true: Folgenzahl', verweisJa.includes('ZAHL(https://x/d)'), verweisJa.slice(0, 300))
const verweisNein = pille(weg('https://x/e', {}), titel([{ platform: 'netflix', url: 'https://x/e', dub: false }]))
pruefe('Verweis mit dub: false: keine Zahl', !verweisNein.includes('ZAHL(') && !verweisNein.includes('detail.nurFolge'), verweisNein.slice(0, 300))
const ohneVerweis = pille(weg('https://x/f', {}), titel([{ platform: 'netflix', url: 'https://x/andere', dub: true }]))
pruefe('Verweis mit anderer Adresse: keine Zahl', !ohneVerweis.includes('ZAHL('), ohneVerweis.slice(0, 300))

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
