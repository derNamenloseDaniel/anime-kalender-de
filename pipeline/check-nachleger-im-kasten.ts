/**
 * Zusicherung (27.11.2026, Black Clover S2, Daniel: „keine folgen ankündigung info im folgen kasten, das gehört in roten kasten“):
 * Die Nachleger-Zeile („Crunchyroll: Folge 4 am Sa 28.11. um 17:00 Uhr“) steht im Kopf des roten Kastens, nie in der Folgenliste darunter.
 * Aufruf: `npm run check:logic`.
 */
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Release, Title } from '../shared/types.ts'
import { KastenKopfblock } from '../web/src/components/detail/antwort-kasten-kopfblock.tsx'
import { FolgenMitNachlegern, nachlegerZeilen } from '../web/src/components/detail/nachleger-zeilen.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const ZEILE = 'Crunchyroll: Folge 4 am Sa 28.11. um 17:00 Uhr'
const antwort = { art: 'laeuft', haupt: { platform: 'netflix', date: '2026-11-29', episode: 5 } }
const titel = { id: 1, slug: 't' } as unknown as Title
const umschalter = { aktivDisc: false, streamLeer: false, discLeer: true, onWahl: () => undefined }
const kopf = (nachleger?: string[]) =>
  renderToStaticMarkup(
    h(KastenKopfblock, {
      antwort,
      title: titel,
      today: '2026-11-27',
      T: (k: string) => k,
      haupt: 'Nächste Folge',
      gedaempft: false,
      neben: '',
      zaehl: '',
      umschalter,
      nachleger,
    } as never),
  )

pruefe('Kopf des roten Kastens trägt die Nachleger-Zeile', kopf([ZEILE]).includes(ZEILE))
pruefe('ohne Nachleger steht dort nichts', !kopf().includes('Crunchyroll'))

const ev = (platform: string, schedule: object): Release => ({ slug: platform, titleId: 1, platform, releaseType: 'weekly', schedule }) as unknown as Release
const releases = [
  ev('netflix', { firstEpisodeDate: '2026-10-25', firstEpisodeNumber: 1, episodeCount: 8 }),
  ev('crunchyroll', { firstEpisodeDate: '2026-11-28', firstEpisodeNumber: 4, episodeCount: 3, time: '17:00' }),
]
const zeilen = nachlegerZeilen(antwort as never, releases, '2026-11-27')
pruefe('nachlegerZeilen liefert die Zeile mit Tag und Uhrzeit', zeilen.some((z) => z.includes('um 17:00 Uhr')), zeilen)
pruefe('Antwort „ohne“ hat keine Nachleger', nachlegerZeilen({ art: 'ohne' } as never, releases, '2026-11-27').length === 0)

const liste = renderToStaticMarkup(h(FolgenMitNachlegern, { titleId: 1, wege: [], antwort: antwort as never, releases, today: '2026-11-27' }))
pruefe('Folgenliste enthält keine Nachleger-Zeile mehr', !liste.includes('Uhr') && !liste.includes(' am Sa '), liste.slice(0, 200))

console.log(verletzt ? `✖ ${verletzt} Verstöße` : '✔ Nachleger stehen nur im roten Kasten')
process.exit(verletzt ? 1 : 0)
