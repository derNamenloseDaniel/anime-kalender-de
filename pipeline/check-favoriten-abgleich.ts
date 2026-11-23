/**
 * Zusicherung (Daniel, 23.11.2026): Favoriten gleichen sich zwischen Geräten mit demselben Newsletter-Konto ab —
 * Handy und PC behalten, was sie je gemerkt haben; Entferntes einer Seite wirkt auf die andere.
 * Aufruf: `npm run check:logic`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { MIN_ABSTAND_MS, starteTakt } from '../web/src/lib/favoriten-takt.ts'
import { ergaenzungBeimErstabgleich, gleicheAb, vereinigeFavoriten } from '../web/src/lib/favoriten-vereinigen.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const s = (a: number[]) => new Set(a)
const v = (b: number[] | null, l: number[], sv: number[]) => [...vereinigeFavoriten(b === null ? null : s(b), s(l), s(sv))].sort((x, y) => x - y)

console.log('\nFavoriten-Abgleich (Drei-Wege-Vereinigung):')
pruefe('Handy kennt nur Server, PC nur lokal: beide Listen vereint', JSON.stringify(v(null, [1, 2], [3])) === '[1,2,3]', v(null, [1, 2], [3]))
pruefe('Ohne Basis wird nie gelöscht', JSON.stringify(v(null, [], [5])) === '[5]')
pruefe('Server hat dazu (anderes Gerät): lokal übernimmt', JSON.stringify(v([1], [1], [1, 2])) === '[1,2]')
pruefe('Anderes Gerät hat entfernt: lokal entfernt ebenfalls', JSON.stringify(v([1, 2], [1, 2], [1])) === '[1]')
pruefe('Lokal entfernt, Server noch alt: bleibt entfernt', JSON.stringify(v([1, 2], [1], [1, 2])) === '[1]')
pruefe('Beide ergänzen verschieden: beides bleibt', JSON.stringify(v([1], [1, 2], [1, 3])) === '[1,2,3]')
pruefe('Negative Kennungen bleiben', JSON.stringify(v([-4], [-4, 7], [-4])) === '[-4,7]')

/** Ein Gerät aus Attrappen: lokaler Speicher, gemerkte Basis, Serverstand; Aufrufe werden mitgeschrieben. */
function geraet(o: { lokal: number[]; basis: string | null; server: number[]; pushFehler?: boolean; pullFehler?: boolean; sternWaehrendPush?: number }) {
  const z = { lokal: new Set(o.lokal), basis: o.basis, server: [...o.server], gesendet: [] as number[][], gesetzt: 0 }
  const anschluss = {
    hole: async () => {
      if (o.pullFehler) throw new Error('offline')
      return z.server
    },
    sende: async (ids: number[]) => {
      if (o.pushFehler) throw new Error('offline')
      z.gesendet.push(ids)
      z.server = ids
      if (o.sternWaehrendPush !== undefined) z.lokal.add(o.sternWaehrendPush)
    },
    lokal: () => new Set(z.lokal),
    setzeLokal: (ids: Set<number>) => {
      z.lokal = new Set(ids)
      z.gesetzt++
    },
    basis: () => z.basis,
    merkeBasis: (t: string) => {
      z.basis = t
    },
  }
  return { z, anschluss }
}
const lauf = async (o: Parameters<typeof geraet>[0]) => {
  const g = geraet(o)
  const fehler = await gleicheAb(g.anschluss).then(() => null, (e: Error) => e.message)
  return { ...g.z, lokal: [...g.z.lokal].sort((a, b) => a - b), fehler }
}

console.log('\nFavoriten-Abgleich (Verdrahtung mit Attrappen):')
const handy = await lauf({ lokal: [1], basis: '1', server: [1, 2] })
pruefe('Handy übernimmt Titel vom PC und merkt die Basis', JSON.stringify(handy.lokal) === '[1,2]' && handy.basis === '1,2' && handy.gesendet.length === 0, handy)
const pc = await lauf({ lokal: [1, 2, 9], basis: '1,2', server: [1, 2] })
pruefe('PC schickt Neues hoch und merkt danach die Basis', JSON.stringify(pc.gesendet) === '[[1,2,9]]' && pc.basis === '1,2,9' && pc.gesetzt === 0, pc)
const beide = await lauf({ lokal: [1, 9], basis: '1', server: [1, 2] })
pruefe('beide haben Neues: vereint, gesendet, lokal geschrieben', JSON.stringify(beide.lokal) === '[1,2,9]' && JSON.stringify(beide.gesendet) === '[[1,2,9]]', beide)
const pushWeg = await lauf({ lokal: [1, 9], basis: '1', server: [1, 2], pushFehler: true })
pruefe('Senden scheitert: Basis und lokale Liste unverändert', pushWeg.fehler === 'offline' && pushWeg.basis === '1' && pushWeg.gesetzt === 0, pushWeg)
const pullWeg = await lauf({ lokal: [1, 9], basis: '1', server: [1, 2], pullFehler: true })
pruefe('Abholen scheitert: nichts gesendet, nichts geschrieben', pullWeg.fehler === 'offline' && pullWeg.gesendet.length === 0 && pullWeg.gesetzt === 0 && pullWeg.basis === '1', pullWeg)
const rennen = await lauf({ lokal: [1, 9], basis: '1', server: [1, 2], sternWaehrendPush: 7 })
pruefe('Stern während des Sendens geht nicht verloren (kein Überschreiben, keine Basis)', rennen.lokal.includes(7) && rennen.gesetzt === 0 && rennen.basis === '1', rennen)
const erstmals = await lauf({ lokal: [4], basis: null, server: [5] })
pruefe('erster Abgleich ohne Basis: nur vereinigt', JSON.stringify(erstmals.lokal) === '[4,5]' && erstmals.basis === '4,5', erstmals)
/* Fall 23.11.2026: PC-Liste [1,2,3], Server trug nur die Handy-Liste [9]. Mit dem alten Sendestand als Basis gingen 1–3 verloren. */
const pcNachUpdate = await lauf({ lokal: [1, 2, 3], basis: null, server: [9] })
pruefe('PC nach dem Update (neue Basis leer): nichts geht verloren', JSON.stringify(pcNachUpdate.lokal) === '[1,2,3,9]' && JSON.stringify(pcNachUpdate.gesendet) === '[[1,2,3,9]]', pcNachUpdate)
pruefe('Erstabgleich holt Titel der Datums-Ablage zurück', JSON.stringify(ergaenzungBeimErstabgleich(null, [1, 2])) === '[1,2]')
pruefe('nach dem Erstabgleich kommt aus der Datums-Ablage nichts mehr', ergaenzungBeimErstabgleich('1', [1, 2]).length === 0)

/** Takt mit falscher Uhr und falschem Dokument: zählt Abgleiche, Listener und Sichtbarkeit. */
function takt(o: { token?: string; sichtbar?: boolean }) {
  const z = { jetzt: 1_000_000, abgleiche: 0, sichtbar: o.sichtbar ?? true, token: o.token as string | undefined ?? 'tok', hoerer: new Set<() => void>(), fehler: false }
  const aufraeumen = starteTakt({
    token: () => z.token,
    sichtbar: () => z.sichtbar,
    jetzt: () => z.jetzt,
    abgleichen: async () => {
      z.abgleiche++
      if (z.fehler) throw new Error('offline')
    },
    bei: (f) => void z.hoerer.add(f),
    ab: (f) => void z.hoerer.delete(f),
  })
  const zurueck = () => z.hoerer.forEach((f) => f())
  return { z, aufraeumen, zurueck }
}

console.log('\nFavoriten-Abgleich (Takt des Hooks):')
const t1 = takt({})
pruefe('beim Öffnen genau ein Abgleich, Listener hängt', t1.z.abgleiche === 1 && t1.z.hoerer.size === 1, t1.z.abgleiche)
t1.z.jetzt += MIN_ABSTAND_MS - 1
t1.zurueck()
pruefe('Rückkehr in den Tab vor Ablauf der Minute: kein zweiter Abgleich', t1.z.abgleiche === 1, t1.z.abgleiche)
t1.z.jetzt += 1
t1.zurueck()
pruefe('nach einer Minute: zweiter Abgleich', t1.z.abgleiche === 2, t1.z.abgleiche)
t1.z.jetzt += MIN_ABSTAND_MS
t1.z.sichtbar = false
t1.zurueck()
pruefe('versteckter Tab: kein Abgleich', t1.z.abgleiche === 2, t1.z.abgleiche)
t1.aufraeumen()
pruefe('Aufräumen entfernt den Listener', t1.z.hoerer.size === 0)
const t2 = takt({ token: '' })
pruefe('ohne Abgleich-Schlüssel kein Abgleich', t2.z.abgleiche === 0, t2.z.abgleiche)
const t3 = takt({ sichtbar: false })
pruefe('beim Öffnen in einem versteckten Tab kein Abgleich', t3.z.abgleiche === 0, t3.z.abgleiche)
const t4 = takt({})
t4.z.fehler = true
t4.z.jetzt += MIN_ABSTAND_MS
let unbehandelt = false
const merke = () => void (unbehandelt = true)
process.once('unhandledRejection', merke)
t4.zurueck()
await new Promise((r) => setTimeout(r, 20))
process.off('unhandledRejection', merke)
pruefe('scheiternder Abgleich bleibt stumm (keine unbehandelte Ablehnung)', t4.z.abgleiche === 2 && !unbehandelt, { abgleiche: t4.z.abgleiche, unbehandelt })

// Kommentar oder toter Code im Quelltext zählt nicht: ohne Kommentare muss Import und Aufruf stehen.
const app = readFileSync(new URL('../web/src/App.tsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
pruefe('App importiert und ruft useFavoritenAbgleich(favorites) auf (sonst veraltet das zweite Gerät)', /import\s*\{[^}]*useFavoritenAbgleich[^}]*\}\s*from/.test(app) && /^\s*useFavoritenAbgleich\(favorites\)\s*$/m.test(app))
const hook = readFileSync(new URL('../web/src/lib/favoriten-abgleich.ts', import.meta.url), 'utf8')
pruefe('Hook nutzt starteTakt und gleicheAb mit der echten Abholung und Sendung', /starteTakt\(/.test(hook) && /gleicheAb\(/.test(hook) && /pullFavorites\(token\)/.test(hook) && /pushFavorites\(token/.test(hook))
const sync = readFileSync(new URL('../web/src/lib/newsletterSync.ts', import.meta.url), 'utf8')
pruefe('Basis liegt nicht im alten Sendestand-Schlüssel (dort stand der letzte Upload, nicht der gemeinsame Stand)', /gesendeterStand = \(\)[^\n]*getItem\(BASIS_KEY\)/.test(sync) && !/BASIS_KEY = 'newsletterSyncSent'/.test(sync))
/* Ein Hochladen ohne vorheriges Abholen überschreibt, was ein anderes Gerät gemerkt hat. Erlaubt: der Abgleich und der Mail-Link (vereinigt vorher). */
const erlaubt = new Set(['lib/favoriten-abgleich.ts', 'lib/newsletterSync.ts', 'components/StaticViews.tsx'])
const wurzel = new URL('../web/src/', import.meta.url)
const fremd = (readdirSync(wurzel, { recursive: true }) as string[])
  .map((d) => d.replaceAll('\\', '/'))
  .filter((d) => /\.tsx?$/.test(d) && !erlaubt.has(d) && /pushFavorites\(/.test(readFileSync(new URL(d, wurzel), 'utf8')))
pruefe('pushFavorites nur im Abgleich und im Mail-Link (kein blindes Überschreiben)', fremd.length === 0, fremd)
const altSchreiber = (readdirSync(wurzel, { recursive: true }) as string[])
  .filter((d) => /\.tsx?$/.test(d) && /setItem\([^)]*newsletterSyncSent|setItem\(ALT_SENT_KEY/.test(readFileSync(new URL(d, wurzel), 'utf8')))
pruefe('niemand schreibt den alten Sendestand-Schlüssel', altSchreiber.length === 0, altSchreiber)

/*
  Echte Module auf vorhandenem Browser-Speicher (Lehre 242): der erste Fix bestand die Attrappen-Prüfung oben
  und löschte trotzdem, weil ein alter Schlüssel im Speicher lag. Hier laufen favorites.ts, newsletterSync.ts
  und der Hook-Abgleich auf einem befüllten Speicher und einem Server-Stub.
*/
console.log('\nFavoriten-Abgleich auf vorhandenem Speicher (echte Module):')
const speicher = new Map<string, string>()
let serverStand: number[] = []
const hochgeladen: number[][] = []
let meldungen = 0
Object.assign(globalThis, {
  localStorage: { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => void speicher.set(k, String(w)), removeItem: (k: string) => void speicher.delete(k) },
  window: { dispatchEvent: () => ((meldungen++), true), addEventListener: () => undefined, removeEventListener: () => undefined },
  fetch: async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const { favorites } = JSON.parse(String(init.body)) as { favorites: number[] }
      hochgeladen.push(favorites)
      serverStand = favorites
      return new Response(JSON.stringify({ ok: true, count: favorites.length }))
    }
    return new Response(JSON.stringify({ ok: true, favorites: serverStand }))
  },
})
const { abgleichen } = await import('../web/src/lib/favoriten-abgleich.ts')
const sortiert = (k: string) => JSON.stringify((JSON.parse(speicher.get(k) ?? '[]') as number[]).sort((a, b) => a - b))
function befuelle(eintraege: Record<string, string>, server: number[]): void {
  speicher.clear()
  hochgeladen.length = 0
  meldungen = 0
  serverStand = server
  for (const [k, w] of Object.entries({ newsletterSyncToken: 't', ...eintraege })) speicher.set(k, w)
}
const tag = '"2026-11-20"'

befuelle({ favorites: '[1,2,3]', newsletterSyncSent: '1,2,3' }, [9])
await abgleichen('t')
pruefe('alter Sendestand im Speicher, Server vom Handy überschrieben: nichts geht verloren', sortiert('favorites') === '[1,2,3,9]' && JSON.stringify(hochgeladen) === '[[1,2,3,9]]', { lokal: sortiert('favorites'), hochgeladen })
pruefe('alter Sendestand ist danach weg, neue Basis gesetzt', !speicher.has('newsletterSyncSent') && speicher.get('favoritenAbgleichBasis') === '1,2,3,9', [...speicher.keys()])

befuelle({ favorites: '[9]', 'favorites:seit': `{"1":${tag},"2":${tag},"3":${tag},"9":${tag}}` }, [9])
await abgleichen('t')
pruefe('Gerät nach dem Verlust: Titel der Datums-Ablage kommen zurück und gehen auf den Server', sortiert('favorites') === '[1,2,3,9]' && JSON.stringify(serverStand) === '[1,2,3,9]', { lokal: sortiert('favorites'), serverStand })
pruefe('Oberfläche erfährt die Wiederherstellung (Änderungsmeldung)', meldungen > 0, meldungen)

speicher.set('favorites', '[1,3,9]')
speicher.set('favorites:seit', `{"1":${tag},"3":${tag},"9":${tag}}`)
await abgleichen('t')
pruefe('danach Entferntes kommt nicht aus der Datums-Ablage zurück', sortiert('favorites') === '[1,3,9]' && JSON.stringify(serverStand) === '[1,3,9]', { lokal: sortiert('favorites'), serverStand })
if (verletzt) process.exit(1)
