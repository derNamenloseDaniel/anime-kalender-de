/**
 * Zusicherung: der Anbieter-Zuschnitt (`pipeline/lib/anbieter-zuschnitt.ts`, Bau-Phase `pipeline/bau/anbieter-zuschnitt.ts`) setzt
 * `anbieterStaffel` nur, wenn Netflix' Staffelliste Position für Position aufgeht, und lässt Titel und Kennungen unberührt.
 * Fälle: Stone Ocean 12 + 26 gegen Netflix 38; Gegenprobe 12 + 25 und 12 + 27; Steel Ball Run (Netflix 1 + 1, wir 1 + 11). Läuft in `check:logic`.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeZuschnitt } from './bau/anbieter-zuschnitt.ts'
import { markiereZuschnitt, zuschneide, type ZuschnittEintrag, type ZuschnittTitel } from './lib/anbieter-zuschnitt.ts'
import type { FranchiseMember } from '../shared/franchise-typ.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const URL = 'https://www.netflix.com/title/80000001'
const stream = [{ platform: 'netflix' as const, url: URL }]
const titel = (id: number, episodes: number, jpStart: string): ZuschnittTitel => ({ id, episodes, jpStart, format: 'TV', streams: stream })
const listen = (...folgen: number[]) => ({ '80000001': { staffeln: folgen.map((f, i) => ({ seq: i + 1, folgen: f })) } })
const eintrag = (staffel: number, glieder: number[]): ZuschnittEintrag => ({ url: URL, staffel, glieder, quelle: 'Test', datum: '2026-11-28' })
const reihe = (): Record<number, FranchiseMember[]> => ({
  1: [
    { id: 1, name: 'Serie', format: 'TV', episodes: 25, jpStart: '2012-01-01' },
    { id: 2, name: 'Serie Staffel 2', format: 'TV', episodes: 12, jpStart: '2022-01-01' },
    { id: 3, name: 'Serie Staffel 2 - Teil 2', format: 'TV', episodes: 26, jpStart: '2022-07-01' },
  ],
})
const titelAn = (zweiter: number) => [titel(1, 25, '2012-01-01'), titel(2, 12, '2022-01-01'), titel(3, zweiter, '2022-07-01')]
const ohneFeld = (r: Record<number, FranchiseMember[]>) => JSON.stringify(r, (k, v) => (k === 'anbieterStaffel' ? undefined : v))

console.log('\n12 + 26 gegen Netflix 38 (Staffel 2 nach 25 Folgen):')
{
  const r = reihe()
  const vorher = ohneFeld(r)
  const erg = markiereZuschnitt(r, [eintrag(2, [2, 3])], listen(25, 38), titelAn(26))
  const [a, b, c] = r[1]!
  pruefe('Feld an beiden Gliedern: Reihennummer 2, Teil 1 und 2, Folgen 1–12 und 13–38', JSON.stringify([b!.anbieterStaffel, c!.anbieterStaffel]) === JSON.stringify([{ nr: 2, teil: 1, von: 1, bis: 12 }, { nr: 2, teil: 2, von: 13, bis: 38 }]), [b, c])
  pruefe('Staffel davor bleibt ohne Feld, keine Abweichung, eine gesetzt', a!.anbieterStaffel === undefined && erg.gesetzt === 1 && erg.abweichungen.length === 0, erg)
  pruefe('Titelzahl, Kennungen und alle übrigen Felder vorher = nachher', ohneFeld(r) === vorher)
}

console.log('\nGegenprobe an der Summengrenze:')
for (const [zweiter, grund] of [[25, 'Summe 37 statt 38 Folgen'], [27, 'Summe 39 statt 38 Folgen']] as const) {
  const r = reihe()
  r[1]![2]!.episodes = zweiter
  const erg = markiereZuschnitt(r, [eintrag(2, [2, 3])], listen(25, 38), titelAn(zweiter))
  pruefe(`12 + ${zweiter}: kein Feld, gezählte Meldung „${grund}“`, r[1]!.every((m) => !m.anbieterStaffel) && erg.gesetzt === 0 && erg.abweichungen.length === 1 && erg.abweichungen[0]!.grund === grund, erg)
}

console.log('\nPosition für Position:')
{
  const falsch = zuschneide(eintrag(2, [2, 3]), listen(26, 38), titelAn(26))
  pruefe('Netflix 26 vor der Staffel, bei uns 25: nicht aufgegangen', typeof falsch === 'string' && falsch.startsWith('Position'), falsch)
  const luecke = zuschneide(eintrag(2, [1, 3]), listen(25, 38), titelAn(26))
  pruefe('Glieder nicht nebeneinander: nicht aufgegangen', typeof luecke === 'string' && luecke.includes('lückenlos'), luecke)
  const fremd = zuschneide(eintrag(3, [2, 3]), listen(25, 38), titelAn(26))
  pruefe('Staffel, die Netflix nicht kennt: nicht aufgegangen', typeof fremd === 'string' && fremd.includes('kennt keine Staffel 3'), fremd)
  const ohneListe = zuschneide(eintrag(2, [2, 3]), {}, titelAn(26))
  pruefe('Ohne Netflix-Staffelliste: nicht aufgegangen', typeof ohneListe === 'string', ohneListe)
}

console.log('\nSteel Ball Run (Netflix 1 + 1, wir 1 + 11) kippt nicht:')
{
  const sbr = [titel(10, 1, '2026-03-01'), titel(11, 11, '2026-04-01')]
  const r = zuschneide(eintrag(1, [10, 11]), listen(1, 1), sbr)
  pruefe('kein Zuschnitt, weil die Summe nicht aufgeht', typeof r === 'string' && r.startsWith('Summe'), r)
}

console.log('\nReihennummer:')
{
  const r = reihe()
  r[1]![1]!.name = 'Serie Staffel 3'
  const erg = markiereZuschnitt(r, [eintrag(2, [2, 3])], listen(25, 38), titelAn(26))
  pruefe('zählt unsere Reihe die Glieder verschieden, bleibt das Feld weg und die Meldung nennt beide Nummern', erg.gesetzt === 0 && /Staffel 2 und 3|Staffel 3 und 2/.test(erg.abweichungen[0]?.grund ?? ''), erg)
}

console.log('\nYaml laden:')
{
  const ordner = mkdtempSync(join(tmpdir(), 'zuschnitt-'))
  try {
    pruefe('fehlende Datei: keine Einträge', ladeZuschnitt(join(ordner, 'gibt-es-nicht.yaml')).length === 0)
    const datei = join(ordner, 'kaputt.yaml')
    writeFileSync(datei, `- url: ${URL}\n  staffel: 2\n  glieder: [2, 3]\n  quelle: Test\n`)
    let fehler = ''
    try { ladeZuschnitt(datei) } catch (e) { fehler = String(e) }
    pruefe('Eintrag ohne Datum bricht den Bau ab', fehler.includes('ohne Netflix-Adresse, Staffel, Glieder, Quelle oder Datum'), fehler)
    writeFileSync(datei, `- url: ${URL}\n  staffel: 2\n  glieder: [2, 3]\n  quelle: Test\n  datum: '2026-11-28'\n`)
    pruefe('vollständiger Eintrag wird gelesen', ladeZuschnitt(datei).length === 1)
  } finally {
    rmSync(ordner, { recursive: true, force: true })
  }
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt`)
  process.exit(1)
}
console.log('\nOK')
