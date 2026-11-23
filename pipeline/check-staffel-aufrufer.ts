/**
 * Zusicherung: **die echten Aufrufer finden nach dem Schnitt in Staffel-Titel ihre Quelldaten unter dem Sammeltitel** (Prüfer PR 4603, Befund 3:
 * Quelltext-Teilstrings belegen keine Wirkung). Je Aufrufer ein Kindprozess in der Kulisse (`AK_ROOT`, `lib/kulisse-staffel-aufrufer.ts`):
 * TOGGO-Fenster (`setzeToggoFenster`), „Im Angebot seit“ (`schreibeNeuMitSynchro`), Auslieferung (`baueAuslieferung`); dazu `baueNews` direkt
 * (Anbieter-Gedächtnis). Nur die Staffel-Titel erben, gewöhnliche Titel bleiben unberührt. Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import type { Title } from '../shared/types.ts'
import { baueNews, type NewsHistorie } from './lib/news.ts'

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

const tsx = createRequire(import.meta.url).resolve('tsx/esm')
function kind(modus: string): { status: number | null; aus: string; fehler: string } {
  const wurzel = mkdtempSync(join(tmpdir(), 'staffel-aufrufer-'))
  try {
    const r = spawnSync(process.execPath, ['--import', tsx, fileURLToPath(new URL('./lib/kulisse-staffel-aufrufer.ts', import.meta.url)), modus], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 120_000 })
    return { status: r.status, aus: r.stdout.trim().split('\n').pop() ?? '', fehler: r.stderr }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

// --- baueNews: neue Anbieter-Schlüssel nehmen den Tag des Sammeltitels ---------------------------------------------------------------------------
{
  const t = { id: 7_000_001, streams: [{ platform: 'rtlplus', url: 'x', dub: true }, { platform: 'netflix', url: 'y', dub: true }], watchLinks: [], staffelTitel: { sammel: 158871, nr: 1, ab: 1 } } as unknown as Title
  const gewoehnlich = { id: 20, streams: [{ platform: 'rtlplus', url: 'z', dub: true }], watchLinks: [] } as unknown as Title
  const historie = { zuerst: {}, anbieter: { '158871:rtlplus': '2026-11-20', '158871:netflix': '0000-00-00', '20:netflix': '0000-00-00' }, termine: {} } as unknown as NewsHistorie
  baueNews([t, gewoehnlich], [], [], [], historie)
  pruefe('News: Staffel erbt den RTL+-Tag des Sammeltitels', historie.anbieter!['7000001:rtlplus'] === '2026-11-20', JSON.stringify(historie.anbieter))
  pruefe('News: Staffel erbt „altes“ Netflix (0000-00-00), keine Meldung', historie.anbieter!['7000001:netflix'] === '0000-00-00')
  pruefe('News: gewöhnlicher Titel erbt nichts (heute statt Sammeltag)', historie.anbieter!['20:rtlplus'] !== '2026-11-20' && historie.anbieter!['20:rtlplus'] !== undefined)
}

// --- Kindprozesse ---------------------------------------------------------------------------------------------------------------------------------
{
  const k = kind('toggo')
  pruefe('TOGGO: Lauf endet mit Exit 0', k.status === 0, k.fehler.slice(-400))
  pruefe(
    'TOGGO: jede Staffel bekommt nur ihre Folgen (Basis = Staffel 4)',
    k.aus === JSON.stringify({ 7000001: ['1/1'], 7000002: ['2/1'], 158871: ['4/1'] }),
    k.aus,
  )
  const fremd = kind('toggo-fremd')
  pruefe('TOGGO: Folge einer Staffel ohne Titel bricht den Bau ab (Riegel)', fremd.status !== 0 && fremd.fehler.includes('TOGGO-Folgen'), `${fremd.status} ${fremd.fehler.slice(-300)}`)
}
{
  const k = kind('seit')
  pruefe('Im Angebot seit: Lauf endet mit Exit 0', k.status === 0, k.fehler.slice(-400))
  const z = k.status === 0 ? (JSON.parse(k.aus) as { staffel?: string; basis?: string; fremd?: string }) : {}
  pruefe('Im Angebot seit: Staffel erbt den Tag des Sammeltitels', z.staffel === '2026-08-13', k.aus)
  pruefe('Im Angebot seit: Basis behält ihren Tag', z.basis === '2026-08-13')
  pruefe('Im Angebot seit: neuer gewöhnlicher Titel bekommt heute, nicht den Sammeltag', z.fremd !== undefined && z.fremd !== '2026-08-13')
}
{
  const k = kind('auslieferung')
  pruefe('Auslieferung: Lauf endet mit Exit 0', k.status === 0, k.fehler.slice(-400))
  const z = k.status === 0 ? (JSON.parse(k.aus) as { staffel: { stimmen?: boolean; ann?: number; trailer?: string; handlung?: boolean }; gewoehnlich: { stimmen?: boolean; handlung?: boolean } }) : undefined
  pruefe('Auslieferung: Staffel trägt Sprecher, ANN-Kennung, Trailer und Handlung des Sammeltitels', z?.staffel.stimmen === true && z.staffel.ann === 777 && z.staffel.trailer === 'abc' && z.staffel.handlung === true, k.aus)
  pruefe('Auslieferung: gewöhnlicher Titel bekommt nichts vom Sammeltitel', z?.gewoehnlich.stimmen === undefined && z?.gewoehnlich.handlung === false, k.aus)
}

{
  const fest = kind('eingaben-festgehalten')
  pruefe('Lader: steht der Schnitt schon im Bestand, bleibt sein `aktiv` (kein Wandern bei jedem Bau)', fest.status === 0 && fest.aus === JSON.stringify(['2026-11-20']), `${fest.status} ${fest.aus} ${fest.fehler.slice(-300)}`)
  const leer = kind('eingaben-leer')
  const tage = leer.status === 0 ? (JSON.parse(leer.aus) as string[]) : []
  pruefe('Lader: ohne den Schnitt im Bestand gilt der Tag nach dem Bau', tage.length === 1 && tage[0]! > '2026-11-20' && /^\d{4}-\d\d-\d\d$/.test(tage[0]!), `${leer.status} ${leer.aus} ${leer.fehler.slice(-300)}`)
}
console.log(`check-staffel-aufrufer: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
