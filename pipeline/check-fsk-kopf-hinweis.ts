/**
 * Zusicherung (Daniel, 24.11.2026): Die Altersfreigabe im Kopf des Detail-Panels steht kurz da („FSK 6“, abgeleitet „≈ FSK 6“),
 * der Zusatz „laut Anbieter“ / „wie die anderen Teile“ nur im Hinweis — sonst bricht die Zeile am Handy um.
 * Belegte FSK ohne Quelle hat keinen Hinweis. Aufruf: `npm run check:logic`.
 */
import type { Title } from '../shared/types.ts'
import { fskAngabeVon, unterzeileVon } from '../web/src/components/detail/kopf-texte.ts'
import { translate } from '../web/src/lib/i18n.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    verletzt++
    console.error(`✗ ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
  }
}

const titel = (mehr: Partial<Title>) => ({ id: 1, episodes: 24, ...mehr }) as unknown as Title

const anbieter = fskAngabeVon(titel({ fsk: 6, fskQuelle: 'justwatch' }), translate)
pruefe('justwatch: Text kurz', anbieter?.text === 'FSK 6', anbieter)
pruefe('justwatch: Zusatz im Hinweis', anbieter?.hinweis === 'FSK 6 laut Anbieter', anbieter)

const reihe = fskAngabeVon(titel({ fsk: 12, fskQuelle: 'franchise' }), translate)
pruefe('franchise: Text kurz mit ≈', reihe?.text === '≈ FSK 12', reihe)
pruefe('franchise: Zusatz im Hinweis', reihe?.hinweis === '≈ FSK 12, wie die anderen Teile', reihe)

const belegt = fskAngabeVon(titel({ fsk: 16 }), translate)
pruefe('ohne Quelle: Text kurz, kein Hinweis', belegt?.text === 'FSK 16' && belegt.hinweis === undefined, belegt)

pruefe('ohne FSK: nichts', fskAngabeVon(titel({}), translate) === undefined)

const unter = unterzeileVon(titel({ fsk: 6, fskQuelle: 'justwatch' }), 'Staffel 23-25', false, translate)
pruefe('Unterzeile ohne FSK-Text', !/FSK|Anbieter/.test(unter), unter)

const zwei = unterzeileVon(titel({ episodes: 24 }), 'Staffel 2', false, translate)
pruefe('Unterzeile mit zwei Gliedern: Trenner „ · “', zwei === 'Staffel 2 · 24 Folgen', zwei)

if (verletzt) {
  console.error(`${verletzt} Verstöße`)
  process.exit(1)
}
console.log('check-fsk-kopf-hinweis: ok')
