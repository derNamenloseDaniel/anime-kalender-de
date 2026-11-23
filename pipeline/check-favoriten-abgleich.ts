/**
 * Zusicherung (Daniel, 23.11.2026): Favoriten gleichen sich zwischen Geräten mit demselben Newsletter-Konto ab —
 * Handy und PC behalten, was sie je gemerkt haben; Entferntes einer Seite wirkt auf die andere.
 * Aufruf: `npm run check:logic`.
 */
import { readFileSync } from 'node:fs'
import { gleicheAb, vereinigeFavoriten } from '../web/src/lib/favoriten-vereinigen.ts'

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

// Kommentar oder toter Code im Quelltext zählt nicht: ohne Kommentare muss Import und Aufruf stehen.
const app = readFileSync(new URL('../web/src/App.tsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
pruefe('App importiert und ruft useFavoritenAbgleich auf (sonst veraltet das zweite Gerät)', /import\s*\{[^}]*useFavoritenAbgleich[^}]*\}\s*from/.test(app) && /^\s*useFavoritenAbgleich\(\)\s*$/m.test(app))
const hook = readFileSync(new URL('../web/src/lib/favoriten-abgleich.ts', import.meta.url), 'utf8')
pruefe('Hook nutzt gleicheAb mit der echten Abholung und Sendung', /gleicheAb\(/.test(hook) && /pullFavorites\(token\)/.test(hook) && /pushFavorites\(token/.test(hook))
if (verletzt) process.exit(1)
