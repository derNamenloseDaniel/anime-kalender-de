/**
 * Zusicherung (F157, 24.11.2026): **alte Staffel-Kennungen von Pokémon Horizonte ziehen mit Versatz auf die Serie um.**
 * - Heutige Leser von `ak-umleitung.json` (Browser `new Map(paare)`, Worker `leseFavoriten`) vertragen ein Paar mit drittem Element.
 * - „Gesehen bis k“ an Staffel N wird durchlaufend `von − 1 + k` (Versatz aus `data/curated/horizonte-staffeln.yaml`), das Maximum gilt;
 *   Favoriten [26469, 14839] werden ein Eintrag. Der Browser schreibt das auf dem Gerät um, das ist nicht umkehrbar.
 * - `uebersetzeVerzeichnis` legt die Dreier aus `zuAk` und Yaml ab (Kulisse mit `kennungen.json` samt `zuAk`).
 * - Jede `alteKennung` jeder `*-staffeln.yaml` zieht in `data/kennungen.json` per `zuAk` auf die Serie um (sonst ist `/t/<alt>/` tot).
 * Läuft in `check:logic`.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { adresseNachfolger, leseUmleitung, umleiteKarte, umleiteListe, type UmleitungsPaar } from '../web/src/lib/ak-umleiten.ts'
import { leseFavoriten } from '../worker/src/favoriten-lesen.ts'
import { HORIZONTE_STAFFELN, ladeStaffelGrenzen, type StaffelGrenzen } from './lib/pokemon-staffeln.ts'
import { mitVersatz, staffelVersatz } from './lib/staffel-versatz.ts'
import { uebersetzeVerzeichnis, type KennungsZeile } from './lib/ausgabe-kennung.ts'

let faelle = 0
let fehler = 0
function pruefe(name: string, ok: boolean, ...info: unknown[]): void {
  faelle++
  if (ok) return
  fehler++
  console.log(`✖ ${name}`, ...info.map((x) => JSON.stringify(x)))
}

const DREIER: UmleitungsPaar[] = [[26469, 14839], [26470, 14839, 45], [26471, 14839, 89]]

/* M3: heutige Leser, wie sie die Datei lesen (`new Map(paare)`). */
const heute = new Map(DREIER as unknown as [number, number][])
pruefe('heute, Browser: Map aus Dreiern führt alt → neu', heute.get(26470) === 14839 && heute.size === 3)
pruefe('heute, Browser: Favoriten [26469, 14839] → ein Eintrag', JSON.stringify(umleiteListe([26469, 14839], heute)) === '[14839]')
pruefe('heute, Browser: /t/26470/ → /t/14839/', adresseNachfolger('/t/26470/', '', heute)?.pfad === '/t/14839/')
pruefe('heute, Worker: Favoriten ak:26469,14839 → ein Eintrag', [...leseFavoriten('ak:26469,14839', { umleitung: heute })].join() === '14839')

/* Versatz im Browser. */
const { abbild, versatz } = leseUmleitung(DREIER)
const gesehen = (alt: Record<string, unknown>) => JSON.stringify(umleiteKarte(alt, abbild, versatz))
pruefe('Staffel 2 „5“ → 50', gesehen({ 26470: 5 }) === '{"14839":50}', gesehen({ 26470: 5 }))
pruefe('Staffel 3 „5“ → 94', gesehen({ 26471: 5 }) === '{"14839":94}', gesehen({ 26471: 5 }))
pruefe('Staffel 1 „5“ → 5 (kein Versatz)', gesehen({ 26469: 5 }) === '{"14839":5}')
pruefe('Maximum: vorhandene 60 an 14839 schlägt Staffel 2 „5“ (= 50)', gesehen({ 14839: 60, 26470: 5 }) === '{"14839":60}', gesehen({ 14839: 60, 26470: 5 }))
pruefe('Maximum: Staffel 3 „5“ (= 94) schlägt vorhandene 20, Reihenfolge egal', gesehen({ 26471: 5, 14839: 20 }) === '{"14839":94}' && gesehen({ 14839: 20, 26471: 5 }) === '{"14839":94}')
pruefe('der Wert an der Serie selbst bekommt keinen Versatz', gesehen({ 14839: 7 }) === '{"14839":7}')
pruefe('ohne Versatz-Abbild (Tage, „gemerkt seit“) bleibt der Wert', JSON.stringify(umleiteKarte({ 26470: '2026-11-21' }, abbild)) === '{"14839":"2026-11-21"}')
pruefe('Staffel 2 „1“ → 46, „0“ (nichts gesehen) bleibt 0', gesehen({ 26470: 1 }) === '{"14839":46}' && gesehen({ 26470: 0 }) === '{"14839":0}', gesehen({ 26470: 1 }), gesehen({ 26470: 0 }))
pruefe('ohne Versatz-Abbild: Zahlen nur umgeleitet', JSON.stringify(umleiteKarte({ 26470: 5 }, abbild)) === '{"14839":5}')
pruefe('Tage mit Versatz-Abbild bleiben Tage', JSON.stringify(umleiteKarte({ 26470: '2026-11-21' }, abbild, versatz)) === '{"14839":"2026-11-21"}')
pruefe('Wert an einer Kennung ohne Umleitung bekommt keinen Versatz', JSON.stringify(umleiteKarte({ 9: 5 }, abbild, new Map([[9, 45]]))) === '{"9":5}')
pruefe('Favoriten [26469, 14839] → ein Eintrag (neuer Weg)', JSON.stringify(umleiteListe([26469, 14839], abbild)) === '[14839]')

/* Versatz aus der Yaml (nicht hart codiert): Kennungszeilen wie `data/kennungen.json` nach dem Folge-PR mit `zuAk`. */
const zeilen: KennungsZeile[] = [[14839, 158871, 17947], [26469, 7000001, 17947, 14839], [26470, 7000002, 17947, 14839], [26471, 7000003, 17947, 14839], [5, 20, 0, 6], [6, 21, 0]]
const v = staffelVersatz(zeilen, ladeStaffelGrenzen(HORIZONTE_STAFFELN))
const paare = mitVersatz([[26469, 14839], [26470, 14839], [26471, 14839], [5, 6]], v)
pruefe('Yaml: Staffel 2 Versatz 45, Staffel 3 Versatz 89, Staffel 1 und fremde Paare ohne', JSON.stringify(paare) === '[[26469,14839],[26470,14839,45],[26471,14839,89],[5,6]]', paare)
pruefe('Versatz nur, wenn das Paar auf die Serie zeigt', JSON.stringify(mitVersatz([[26470, 99]], v)) === '[[26470,99]]')
const abbruch = (z: KennungsZeile[]): string => {
  try {
    staffelVersatz(z, ladeStaffelGrenzen(HORIZONTE_STAFFELN))
    return ''
  } catch (e) {
    return (e as Error).message
  }
}
pruefe('fehlt eine alte Kennung in kennungen.json, bricht es ab und nennt sie (kein stiller Versatz 0)', abbruch([[14839, 158871, 17947]]) === 'Staffel-Versatz: Kennung 7000002 fehlt in data/kennungen.json', abbruch([[14839, 158871, 17947]]))
pruefe('fehlt die Serie, nennt es die Serie', abbruch([[26470, 7000002, 0], [26471, 7000003, 0]]) === 'Staffel-Versatz: Kennung 158871 fehlt in data/kennungen.json', abbruch([[26470, 7000002, 0], [26471, 7000003, 0]]))

/** Alte Staffel-Kennungen (anilist-Kennung), deren Zeile fehlt oder deren `zuAk` nicht auf die ak der Serie zeigt. */
function ohneUmzug(z: KennungsZeile[], grenzen: StaffelGrenzen[]): number[] {
  const je = new Map(z.map((k) => [k[1], k]))
  return grenzen.flatMap((g) => g.staffeln.flatMap((s) => (s.alteKennung === undefined || (je.get(s.alteKennung)?.[3] !== undefined && je.get(s.alteKennung)?.[3] === je.get(g.anilistId)?.[0]) ? [] : [s.alteKennung])))
}
const echt = (JSON.parse(readFileSync(join(dirname(HORIZONTE_STAFFELN), '..', 'kennungen.json'), 'utf8')) as { titel: KennungsZeile[] }).titel
const fehlend = ohneUmzug(echt, ladeStaffelGrenzen())
pruefe('data/kennungen.json: jede alteKennung der *-staffeln.yaml hat zuAk auf die Serie', fehlend.length === 0, fehlend)
pruefe('Gegenprobe: alte Kennung ohne zuAk wird genannt', JSON.stringify(ohneUmzug([[14839, 158871, 17947], [26469, 7000001, 17947]], [{ anilistId: 158871, staffeln: [{ nr: 1, von: 1, alteKennung: 7000001 }] }])) === '[7000001]')
pruefe('Gegenprobe: zuAk auf fremde ak wird genannt', JSON.stringify(ohneUmzug([[14839, 158871, 17947], [26469, 7000001, 17947, 5]], [{ anilistId: 158871, staffeln: [{ nr: 1, von: 1, alteKennung: 7000001 }] }])) === '[7000001]')

/* Ende zu Ende: `uebersetzeVerzeichnis` in einer Kulisse. */
const wurzel = mkdtempSync(join(tmpdir(), 'ak-versatz-'))
try {
  mkdirSync(join(wurzel, 'daten', 'curated'), { recursive: true })
  mkdirSync(join(wurzel, 'aus'))
  cpSync(HORIZONTE_STAFFELN, join(wurzel, 'daten', 'curated', 'horizonte-staffeln.yaml'))
  writeFileSync(join(wurzel, 'daten', 'kennungen.json'), JSON.stringify({ titel: zeilen }))
  writeFileSync(join(wurzel, 'daten', 'cartoon-umzug.json'), JSON.stringify([[-9, 21]]))
  uebersetzeVerzeichnis(join(wurzel, 'aus'), join(wurzel, 'daten', 'kennungen.json'))
  const datei = readFileSync(join(wurzel, 'aus', 'ak-umleitung.json'), 'utf8')
  pruefe('ak-umleitung.json: Dreier aus Yaml, dahinter der Cartoon-Umzug', JSON.stringify(JSON.parse(datei)) === '[[26469,14839],[26470,14839,45],[26471,14839,89],[5,6],[-9,6]]', datei)
  rmSync(join(wurzel, 'daten', 'cartoon-umzug.json'))
  rmSync(join(wurzel, 'daten', 'curated'), { recursive: true })
  uebersetzeVerzeichnis(join(wurzel, 'aus'), join(wurzel, 'daten', 'kennungen.json'))
  pruefe('ohne Yaml neben kennungen.json: Paare ohne Versatz', JSON.stringify(JSON.parse(readFileSync(join(wurzel, 'aus', 'ak-umleitung.json'), 'utf8'))) === '[[26469,14839],[26470,14839],[26471,14839],[5,6]]')
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log(`check-ak-umleitung-versatz: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
