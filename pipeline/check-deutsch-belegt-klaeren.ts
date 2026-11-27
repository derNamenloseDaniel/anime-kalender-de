/**
 * Zusicherungen zu `bau/deutsch-belegt-klaeren.ts` und dem Wächter `deutschBelegtTrotzOffen` (26.11.2026; Call of the Night, JoJo Steel Ball Run):
 * Ist Deutsch für Titel und Anbieter belegt, trägt der Termin weder „Synchro offen“ noch den Hinweis „ob mit deutscher Synchro …“.
 */
import { klaereDeutschBelegteTermine } from './bau/deutsch-belegt-klaeren.ts'
import { deutschBelegtTrotzOffen } from './lib/deutsch-belegt.ts'
import { SPRACH_NOTIZEN } from './lib/meldungen.ts'
import { schlussFehler } from './lib/pruefung.ts'
import type { Release, Title } from '../shared/types.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const NOTIZ = SPRACH_NOTIZEN[0]!
const NETFLIX = 'https://www.netflix.com/title/1'
const titel = (streams: Title['streams'], extra: Partial<Title> = {}): Title => ({ id: 7, streams, ...extra }) as unknown as Title
const termin = (extra: Partial<Release> = {}): Release =>
  ({ slug: 's', name: 'Probe', titleId: 7, platform: 'netflix', platformUrl: NETFLIX, automatisch: true, releaseType: 'batch', sprache: 'offen', hinweis: NOTIZ, schedule: { firstEpisodeDate: '2026-11-25' }, sources: ['https://a/'], ...extra }) as unknown as Release
const lauf = (r: Release, t: Title) => klaereDeutschBelegteTermine([r], new Map([[7, t]]), new Set(['https://a/']))
const belegt = titel([{ platform: 'netflix', url: NETFLIX, dub: true }])

console.log('\nBelegtes Deutsch:')
{
  const r = termin()
  pruefe('Weg mit dub:true an der Adresse: „offen“ und Hinweis fallen weg', lauf(r, belegt).join() === 's' && r.sprache === undefined && r.hinweis === undefined, r)
  const nurHinweis = termin({ sprache: undefined })
  lauf(nurHinweis, belegt)
  pruefe('auch der Hinweis allein fällt weg', nurHinweis.hinweis === undefined)
  const eigen = termin({ hinweis: 'Die Auftaktfolge lief schon.' })
  lauf(eigen, belegt)
  pruefe('ein eigener Hinweistext bleibt', eigen.hinweis === 'Die Auftaktfolge lief schon.' && eigen.sprache === undefined)
  const omu = termin({ sprache: 'omu' })
  pruefe('omu bleibt', lauf(omu, belegt).length === 0 && omu.sprache === 'omu')
}

console.log('\nNicht belegt:')
{
  const anderer = termin()
  pruefe('Weg an anderer Adresse belegt diesen Termin nicht', lauf(anderer, titel([{ platform: 'netflix', url: 'https://www.netflix.com/title/2', dub: true }])).length === 0 && anderer.sprache === 'offen')
  const anderePlattform = termin()
  pruefe('Weg bei anderem Anbieter belegt nichts', lauf(anderePlattform, titel([{ platform: 'primevideo', url: NETFLIX, dub: true }])).length === 0 && anderePlattform.sprache === 'offen')
  const abgeleitet = termin()
  pruefe('abgeleitetes Deutsch ist kein Beleg', lauf(abgeleitet, titel([{ platform: 'netflix', url: NETFLIX, dub: true, dubAbgeleitet: 'telekom-annahme' } as never])).length === 0)
  const ohne = termin()
  pruefe('Weg ohne dub bleibt offen', lauf(ohne, titel([{ platform: 'netflix', url: NETFLIX }])).length === 0 && ohne.sprache === 'offen')
  const disc = termin({ releaseType: 'disc' })
  pruefe('Disc bleibt', lauf(disc, belegt).length === 0)
}

console.log('\nNetflix-Eigenproduktion:')
{
  const weg = { platform: 'netflix', url: NETFLIX, sharedWith: 2 } as Title['streams'][number]
  const t = titel([weg], { deErstausgabe: { von: '2026-09-25', synchro: true } })
  const r = termin({ sprache: undefined, hinweis: undefined, netflixOriginal: true })
  lauf(r, t)
  pruefe('Eigenproduktion mit Synchro-Marke: Weg wird deutsch belegt', weg.dub === true, weg)
  const lizenz = { platform: 'netflix', url: NETFLIX } as Title['streams'][number]
  lauf(termin({ sprache: undefined, hinweis: undefined }), titel([lizenz], { deErstausgabe: { von: '2026-09-25', synchro: true } }))
  pruefe('Lizenztitel (kein Original) bekommt kein dub', lizenz.dub === undefined)
}

console.log('\nQuelle ohne Synchro-Zusage (Fool Night):')
{
  const r = termin()
  const ohneZusage = klaereDeutschBelegteTermine([r], new Map([[7, belegt]]), new Set())
  pruefe('automatischer Termin, Quelle ohne Zusage: bleibt „offen“ samt Hinweis', ohneZusage.length === 0 && r.sprache === 'offen' && r.hinweis === NOTIZ, r)
  const hand = termin({ automatisch: undefined })
  pruefe('Handtermin braucht keine Quellenzusage', klaereDeutschBelegteTermine([hand], new Map([[7, belegt]]), new Set()).length === 1 && hand.sprache === undefined)
}

console.log('\nWächter:')
{
  pruefe('findet offen trotz Beleg', deutschBelegtTrotzOffen([termin({ automatisch: undefined })], new Map([[7, belegt]])).length === 1 && deutschBelegtTrotzOffen([termin()], new Map([[7, belegt]])).length === 0)
  const sauber = termin()
  lauf(sauber, belegt)
  pruefe('nach dem Klären nichts mehr', deutschBelegtTrotzOffen([sauber], new Map([[7, belegt]])).length === 0)
  pruefe('omu ist keine Unsicherheit: kein Fund', deutschBelegtTrotzOffen([termin({ sprache: 'omu' })], new Map([[7, belegt]])).length === 0)
  pruefe('ohne Beleg kein Fund', deutschBelegtTrotzOffen([termin({ automatisch: undefined })], new Map([[7, titel([])]])).length === 0)
}

{
  const ohneAdresse = titel([{ platform: 'netflix', dub: true } as never])
  pruefe('Weg ohne Adresse (check-staffel-anzeige-bau, Kette 27.11.2026): kein Absturz, kein Beleg', deutschBelegtTrotzOffen([termin({ automatisch: undefined })], new Map([[7, ohneAdresse]])).length === 0)
}

console.log('\nVerdrahtung (schlussFehler, wie die Bau-Prüfung sie ruft):')
{
  const t = new Map([[7, belegt]])
  const offen = termin({ automatisch: undefined })
  const fehler = schlussFehler([offen], [], t, '2026-11-27').filter((f) => f.includes('"s"') && f.includes('Deutsch ist belegt'))
  pruefe('offen trotz Beleg: schlussFehler meldet den Termin', fehler.length === 1, fehler)
  lauf(offen, belegt)
  pruefe('nach dem Klären meldet schlussFehler nichts dazu', schlussFehler([offen], [], t, '2026-11-27').every((f) => !f.includes('Deutsch ist belegt')))
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exitCode = 1
} else console.log('\nalles grün')
