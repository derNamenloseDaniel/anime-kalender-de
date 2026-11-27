/**
 * Zusicherungen zum Teilen-Knopf (Daniel 27.11.2026: „share btn fehlt bei titel ohne synchro“): Jeder Titel hat einen Knopf. Titel mit
 * Teilen-Seite nennen `/t/<ak>/`, der Katalog ohne Synchro (keine Seite, die 404 führt zur Startseite) die Hash-Adresse, die sein Panel
 * öffnet. Nur Fixtures. Aufruf: `npm run check:logic`.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Title } from '../shared/types.ts'
import { teilenZiel } from '../shared/teilen.ts'
import { parseHash } from '../web/src/lib/router.ts'
import { useLang } from '../web/src/lib/i18n.tsx'
import { PanelAktionen } from '../web/src/components/detail/aktionen.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const mitSeite = { id: 15957, slug: '15957' } as Title
const ohneSynchro = { id: 8117, slug: '8117', ohneSynchro: true } as Title
const cartoon = { id: -284833, slug: 'avatar-die-sieben-haefen-284833' } as Title
pruefe('Titel mit Teilen-Seite: /t/<ak>/', teilenZiel(mitSeite) === 't/15957/', teilenZiel(mitSeite))
pruefe('Cartoon: Seite unter dem Namens-Pfad', teilenZiel(cartoon) === 't/avatar-die-sieben-haefen-284833/', teilenZiel(cartoon))
pruefe('ohne Synchro: Hash-Adresse statt toter Seite', teilenZiel(ohneSynchro) === '#/woche?t=8117', teilenZiel(ohneSynchro))
pruefe('die Hash-Adresse öffnet den Titel', parseHash(teilenZiel(ohneSynchro)).title === 8117, parseHash(teilenZiel(ohneSynchro)))

/* Gerendert: der Knopf steht bei jedem Titel, auch ohne Synchro (vorher fehlte er dort). */
const { t } = useLang()
const knoepfe = (title: Title) =>
  renderToStaticMarkup(createElement(PanelAktionen, { title, favorites: new Set<number>(), onToggleFavorite() {}, onToggleHidden() {}, t, trailer: null }))
pruefe('Panel: Teilen-Knopf beim Titel ohne Synchro', knoepfe(ohneSynchro).includes(`aria-label="${t('detail.share')}"`), knoepfe(ohneSynchro))
pruefe('Panel: Teilen-Knopf beim Titel mit Seite', knoepfe(mitSeite).includes(`aria-label="${t('detail.share')}"`))

process.exit(verletzt ? 1 : 0)
