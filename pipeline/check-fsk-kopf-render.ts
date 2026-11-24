/**
 * Zusicherung (Daniel, 24.11.2026): Der gerenderte Kopf des Detail-Panels (`PanelBuehne`) zeigt die Altersfreigabe kurz
 * („FSK 6“, abgeleitet „≈ FSK 6“); der Hinweis „laut Anbieter“ steckt nie im Kopftext. Nur bei Quelle justwatch/franchise
 * ist die FSK Tooltip-Auslöser (gepunktet unterstrichen, per Tab erreichbar). Aufruf: `npm run check:logic`.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Title } from '../shared/types.ts'
import { PanelBuehne } from '../web/src/components/detail/buehne.tsx'
import { translate } from '../web/src/lib/i18n.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    verletzt++
    console.error(`✗ ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
  }
}

/** Der Absatz mit Unterzeile und FSK (`<p class="mt-1 text-t3 …">`), als HTML und als sichtbarer Text. */
function kopfAbsatz(mehr: Partial<Title>): { html: string; text: string } {
  const title = { id: 1, slug: 'x', titleRomaji: 'Test', episodes: 24, ...mehr } as unknown as Title
  const html = renderToStaticMarkup(
    createElement(PanelBuehne, {
      reihenName: 'Test',
      teilName: 'Test',
      reihenTeile: [],
      buehnenBild: undefined,
      title,
      onToggleHidden: () => {},
      favorites: new Set<number>(),
      onToggleFavorite: () => {},
      onClose: () => {},
      t: translate,
      folgenImKasten: true,
      eigenerTeil: undefined,
      kinoRelease: undefined,
    }),
  )
  const absatz = /<p class="mt-1 text-t3[^>]*>(.*?)<\/p>/.exec(html)?.[0] ?? ''
  return { html: absatz, text: absatz.replace(/<[^>]*>/g, '') }
}
const ausloeser = (html: string) => /underline decoration-dotted/.test(html) && /tabindex="0"/.test(html)

const anbieter = kopfAbsatz({ fsk: 6, fskQuelle: 'justwatch' })
pruefe('justwatch: sichtbarer Text', anbieter.text === 'FSK 6', anbieter.text)
pruefe('justwatch: kein „laut Anbieter“ im Kopf', !/Anbieter/.test(anbieter.html), anbieter.html)
pruefe('justwatch: Auslöser unterstrichen und per Tab erreichbar', ausloeser(anbieter.html), anbieter.html)

const reihe = kopfAbsatz({ fsk: 6, fskQuelle: 'franchise' })
pruefe('franchise: sichtbarer Text mit ≈', reihe.text === '≈ FSK 6', reihe.text)
pruefe('franchise: kein „wie die anderen Teile“ im Kopf', !/anderen Teile/.test(reihe.html), reihe.html)
pruefe('franchise: Auslöser unterstrichen und per Tab erreichbar', ausloeser(reihe.html), reihe.html)

const belegt = kopfAbsatz({ fsk: 6 })
pruefe('ohne Quelle: sichtbarer Text', belegt.text === 'FSK 6', belegt.text)
pruefe('ohne Quelle: kein Auslöser', !/underline|tabindex/.test(belegt.html), belegt.html)

pruefe('ohne FSK: kein FSK im Kopf', !/FSK/.test(kopfAbsatz({}).html))

const ohneUnterzeile = kopfAbsatz({ fsk: 6, fskQuelle: 'justwatch', episodes: 1 })
pruefe('FSK ohne Unterzeile: nur die FSK, kein führendes „·“', ohneUnterzeile.text === 'FSK 6', ohneUnterzeile.text)

if (verletzt) {
  console.error(`${verletzt} Verstöße`)
  process.exit(1)
}
console.log('check-fsk-kopf-render: ok')
