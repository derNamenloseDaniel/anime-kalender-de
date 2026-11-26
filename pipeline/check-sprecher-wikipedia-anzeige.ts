/**
 * Zusicherung zur Anzeige der Wikipedia-Sprecher (`web/src/components/detail/weitere.tsx`): die Quellenzeile verlinkt die
 * Wikipedia-Seite (CC BY-SA 4.0 verlangt Quelle mit Link), eine vermutete Besetzung steht mit „≈ Vermutet: <Grund>“ über
 * der Liste, eine sichere ohne. Gerendert werden `VoiceQuellen` und `VoiceVermutet`. Aufruf: `npm run check:logic`.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '../web/src/lib/i18n-spaet.ts'
import { loadVoices, type Voices } from '../web/src/lib/data.ts'
import { VoiceQuellen, VoiceVermutet } from '../web/src/components/detail/weitere.tsx'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const url = 'https://de.wikipedia.org/wiki/Attack_on_Titan'
const wiki = (unsicher?: string): Voices => ({
  roles: [{ character: 'Eren', actor: 'Anna Alt', von: 'wikipedia' }],
  wikipedia: { seite: 'Attack on Titan', url, ...(unsicher ? { unsicher } : {}) },
})
const quellen = (s: Voices) => renderToStaticMarkup(createElement(VoiceQuellen, { stimmen: s }))
const vermutet = (s: Voices) => renderToStaticMarkup(createElement(VoiceVermutet, { stimmen: s }))

console.log('\nSprecher aus Wikipedia: Anzeige')
pruefe('Quellenzeile verlinkt die Seite', quellen(wiki()).includes(`<a href="${url}"`) && quellen(wiki()).includes('Wikipedia („Attack on Titan“)'), quellen(wiki()))
pruefe('Quellenzeile ohne Komma vor dem ersten Link', quellen(wiki()).includes('Angaben von <a'), quellen(wiki()))
pruefe('sichere Besetzung: keine ≈-Zeile', vermutet(wiki()) === '', vermutet(wiki()))
pruefe('vermutete Besetzung: ≈ mit Grund', vermutet(wiki('Film nicht genannt')).includes('≈ Vermutet: Film nicht genannt'), vermutet(wiki('Film nicht genannt')))
const ohneWikiRollen: Voices = { ...wiki('Film nicht genannt'), roles: [{ character: 'Eren', actor: 'Bernd Bar', von: 'anisearch' }] }
pruefe('Vermerk ohne Wikipedia-Rollen: kein Link, kein ≈', !quellen(ohneWikiRollen).includes('wikipedia.org') && vermutet(ohneWikiRollen) === '', quellen(ohneWikiRollen))
const mitAnn: Voices = { roles: [{ character: 'A', actor: 'B', von: 'ann' }], annUrl: 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=1' }
pruefe('ANN-Link bleibt wie bisher', quellen(mitAnn).includes(`<a href="${mitAnn.annUrl}"`) && quellen(mitAnn).includes('>Anime News Network</a>') && quellen(mitAnn).includes('Angaben von <a'), quellen(mitAnn))
pruefe('aniSearch vor dem Link mit Komma', quellen({ ...mitAnn, roles: [...mitAnn.roles, { character: 'C', actor: 'D', von: 'anisearch' }] }).includes('aniSearch, <a'))

// Laden: `loadVoices` reicht Rollen, ANN-Adresse und Wikipedia-Vermerk aus `voices/<id>.json` durch.
const datei = { titleId: 900001, roles: [{ character: 'Eren', actor: 'Anna Alt', von: 'wikipedia' }], annUrl: 'https://a', wikipedia: { seite: 'S', url: 'https://w', unsicher: 'Film' } }
const gefragt: string[] = []
const echtFetch = globalThis.fetch
globalThis.fetch = (async (u: string) => (gefragt.push(String(u)), new Response(JSON.stringify(datei), { status: 200 }))) as typeof fetch
const geladen = await loadVoices(900001)
globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch
const fehlt = await loadVoices(900002)
globalThis.fetch = echtFetch
pruefe('loadVoices: fehlende Datei heißt „keine Rollen“, kein Fehler', JSON.stringify(fehlt) === '{"roles":[]}', fehlt)
pruefe('loadVoices reicht Rollen, annUrl und wikipedia durch', JSON.stringify(geladen) === JSON.stringify({ roles: datei.roles, annUrl: 'https://a', wikipedia: datei.wikipedia }) && gefragt.some((u) => u.includes('voices/900001.json')), [geladen, gefragt])

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nSprecher aus Wikipedia (Anzeige): alle Prüfungen ok')
