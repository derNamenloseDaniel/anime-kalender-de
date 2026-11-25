/**
 * Wächter: Fehler- und Warnmeldungen von `fetchJson` tragen den Wert von api_key/key/token nicht (öffentliches CI-Log). Kein Netz. Aufruf: `check:logic`.
 */
import { fetchJson, maskiereSchluessel } from './lib/util.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const url = 'https://api.themoviedb.org/3/search/tv?api_key=ATTRAPPE123&language=de-DE&query=a%20b'
pruefe('api_key wird ersetzt, Rest der Adresse bleibt', maskiereSchluessel(url) === 'https://api.themoviedb.org/3/search/tv?api_key=***&language=de-DE&query=a%20b', maskiereSchluessel(url))
pruefe('key am Ende und token werden ersetzt', maskiereSchluessel('https://x/y?q=1&key=ATTRAPPE9') === 'https://x/y?q=1&key=***' && maskiereSchluessel('https://x/y?token=ATTRAPPE9&a=1') === 'https://x/y?token=***&a=1')

const meldungen: string[] = []
const warnEcht = console.warn
console.warn = (...a: unknown[]) => void meldungen.push(a.join(' '))
const fetchEcht = globalThis.fetch
let fehler = ''
try {
  globalThis.fetch = (async () => new Response('', { status: 404, statusText: 'Not Found' })) as typeof fetch
  await fetchJson(url).catch((e: Error) => void (fehler = e.message))
  globalThis.fetch = (async () => new Response('', { status: 503, headers: { 'retry-after': '0' } })) as typeof fetch
  await fetchJson(url, {}, 5).catch((e: Error) => void (fehler += ` | ${e.message}`))
  // Warnzeile beim Wiederholen: ein Fehlversuch, dann Erfolg
  let n = 0
  globalThis.fetch = (async () => (n++ ? new Response('{}') : new Response('', { status: 503, headers: { 'retry-after': '1' } }))) as typeof fetch
  await fetchJson(url)
} finally {
  globalThis.fetch = fetchEcht
  console.warn = warnEcht
}
pruefe('Fehlertexte ohne Schlüssel (404 und Versuche erschöpft)', fehler.includes('404') && fehler.includes('Versuchen') && !fehler.includes('ATTRAPPE'), fehler)
pruefe('Warnzeile beim Wiederholen ohne Schlüssel', meldungen.some((m) => m.includes('versuche erneut')) && !meldungen.join('\n').includes('ATTRAPPE'), meldungen)
process.exit(verletzt ? 1 : 0)
