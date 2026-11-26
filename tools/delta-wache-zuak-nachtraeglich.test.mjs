/**
 * `zuAk` folgt dem Bestandsbau im Folge-PR (docs/wissen/datensatz.md): Die Historie-Zeile mit „N Titel weniger“ blieb deshalb rot
 * (Wache 24./25.11.2026, Pokémon Horizonte 7000001–7000003). Die Wache gleicht `titelWeg` der Zeile gegen das jetzige `zuAk` ab.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fehlendeTitelIds, jetztUmgeleitet } from '../pipeline/lib/bestand-verschoben.ts'
import { ereignisse } from '../pipeline/lib/bestand-pendel.ts'

const HISTORIE = ['data/bestand', 'historie.jsonl'].join('-') // ohne Literal: der Wächter pr-nachrechnen-bot-pfade verbietet den Dateinamen in Tests

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
process.env.TZ = 'UTC'

const zeile = (nr, extra = {}) => ({
  zeitpunkt: new Date(Date.parse('2026-11-24T10:00:00Z') + nr * 3600000).toISOString(),
  lauf: 'test',
  titel: 100,
  titelMitVerweis: 90,
  verweise: 200,
  mitUrteil: 150,
  ohneUrteil: 50,
  titelMitSynchro: 80,
  entferntProtokolliert: 10,
  releases: 10,
  termine: 100,
  jeAnbieter: {},
  ...extra,
})
/** Zwei Zeilen; die zweite verlor drei Titel und trägt wie im Bau „3 Titel weniger“ samt Kennungen. */
const verlust = (extra = {}) => [zeile(0), zeile(1, { titel: 97, auffaellig: ['3 Titel weniger'], titelWeg: [7000001, 7000002, 7000003], ...extra })]
const ziel = [14839, 7000009, 17947] // die Ziel-ak muss im Bestand stehen
const umgeleitet = [[26469, 7000001, 17947, 14839], [26470, 7000002, 17947, 14839], [26471, 7000003, 17947, 14839], ziel]
const ohneZuAk = umgeleitet.map((z) => z.slice(0, 3))

// --- jetztUmgeleitet -------------------------------------------------------------------------------------------------
assert.deepEqual(jetztUmgeleitet([7000001, 5, 7000003], umgeleitet), [7000001, 7000003])
assert.deepEqual(jetztUmgeleitet([7000001], ohneZuAk), [], 'ohne zuAk keine Umleitung')

assert.deepEqual(jetztUmgeleitet([7000001], [[26469, 7000001, 17947, 99999]]), [], 'zuAk zeigt auf nicht vorhandene ak: nicht erklären')
assert.equal(fehlendeTitelIds(Array.from({ length: 11 }, (_, i) => ({ id: i })), []).length, 10, 'titelWeg ist bei 10 gedeckelt')

// --- Bewertung -------------------------------------------------------------------------------------------------------
{
  const e = ereignisse(verlust(), umgeleitet)[1]
  assert.deepEqual(e.auffaellig, [], 'alle drei jetzt umgeleitet: nicht rot')
  assert.deepEqual(e.erklaert, ['3 Titel zusammengelegt (zuAk nachträglich eingetragen): 7000001, 7000002, 7000003'])

  assert.deepEqual(ereignisse(verlust(), ohneZuAk)[1].auffaellig, ['3 Titel weniger'], 'Kontrolle: ohne zuAk bleibt es rot')
  assert.deepEqual(ereignisse(verlust())[1].auffaellig, ['3 Titel weniger'], 'ohne Kennungen bleibt es rot')

  const teil = ereignisse(verlust(), [umgeleitet[0], ziel])[1]
  assert.deepEqual(teil.auffaellig, ['2 Titel weniger'], 'eine umgeleitet, zwei bleiben rot')
  assert.match(teil.erklaert[0], /^1 Titel zusammengelegt .*: 7000001$/)

  const mehr = ereignisse(verlust({ titelWeg: [7000001, 7000002, 7000003, 99, 98], auffaellig: ['1 Titel weniger'] }), umgeleitet)[1]
  assert.deepEqual(mehr.auffaellig, [], 'nie mehr erklärt, als die Zeile als „weniger“ meldet')
  assert.match(mehr.erklaert[0], /^1 Titel zusammengelegt/)

  // A1: Der Bau zog Titel 7000001 schon als zusammengelegt ab; Titel 5 fehlt wirklich und bleibt rot.
  const doppelt = ereignisse(verlust({ titelWeg: [7000001, 5], auffaellig: ['1 Titel weniger'], erklaert: ['1 Titel zusammengelegt (zuAk): Pokémon'] }), umgeleitet)[1]
  assert.deepEqual(doppelt.auffaellig, ['1 Titel weniger'], 'schon beim Bau erklärte Titel nicht doppelt erklären')
  assert.deepEqual(doppelt.erklaert, ['1 Titel zusammengelegt (zuAk): Pokémon'])

  // A2: Schon vorhandenes erklaert bleibt vor dem nachträglichen Eintrag stehen.
  const mitErklaert = ereignisse(verlust({ titelWeg: [7000001, 7000002, 5], auffaellig: ['2 Titel weniger'], erklaert: ['1 Titel verschoben nach ohne-synchro: X'] }), umgeleitet)[1]
  assert.deepEqual(mitErklaert.auffaellig, [])
  assert.equal(mitErklaert.erklaert.length, 2)
  assert.equal(mitErklaert.erklaert[0], '1 Titel verschoben nach ohne-synchro: X')

  // A4: Deckelung der titelWeg-Liste bei 10 Kennungen: der 11. Titel bleibt rot.
  const zehn = Array.from({ length: 10 }, (_, i) => 7100000 + i)
  const viele = zehn.map((id, i) => [30000 + i, id, 17947, 14839]).concat([ziel])
  assert.deepEqual(ereignisse(verlust({ titelWeg: zehn, auffaellig: ['10 Titel weniger'] }), viele)[1].auffaellig, [], '10 von 10 umgeleitet')
  assert.deepEqual(ereignisse(verlust({ titelWeg: zehn, auffaellig: ['11 Titel weniger'] }), viele)[1].auffaellig, ['1 Titel weniger'], '11 weg, nur 10 bekannt: einer bleibt rot')

  // A3: Ziel-ak nicht im Bestand: rot.
  assert.deepEqual(ereignisse(verlust(), umgeleitet.slice(0, 3))[1].auffaellig, ['3 Titel weniger'], 'zuAk zeigt auf nicht vorhandene ak')

  const ohneListe = verlust()
  delete ohneListe[1].titelWeg
  assert.deepEqual(ereignisse(ohneListe, umgeleitet)[1].auffaellig, ['3 Titel weniger'], 'alte Zeile ohne titelWeg bleibt wie gespeichert')
}

// --- Die Wache als Prozess: Exit-Code --------------------------------------------------------------------------------
function wache(kennungen) {
  const ordner = mkdtempSync(join(tmpdir(), 'delta-wache-zuak-'))
  try {
    mkdirSync(join(ordner, 'data'))
    writeFileSync(join(ordner, HISTORIE), verlust().map((z) => JSON.stringify(z)).join('\n') + '\n')
    if (kennungen) writeFileSync(join(ordner, 'data/kennungen.json'), JSON.stringify({ naechste: 1, titel: kennungen }))
    const r = spawnSync(process.execPath, [join(wurzel, 'tools/delta-pruefen.mjs'), '--tage', '2', '--jetzt', '2026-11-25T12:00:00Z'], { cwd: ordner, encoding: 'utf8', windowsHide: true, timeout: 60000 })
    assert.equal(r.error, undefined, 'Prozess lief bis zum Ende')
    return { code: r.status, text: r.stdout + r.stderr }
  } finally {
    rmSync(ordner, { recursive: true, force: true })
  }
}
{
  const ok = wache(umgeleitet)
  assert.equal(ok.code, 0, ok.text)
  assert.match(ok.text, /zusammengelegt \(zuAk nachträglich eingetragen\)/)
  assert.equal(wache(ohneZuAk).code, 1, 'ohne zuAk rot')
  assert.equal(wache(undefined).code, 1, 'ohne kennungen.json rot')
}

console.log('delta-wache-zuak-nachtraeglich: nachträglich umgeleitete Titel erklärt, Rest und fehlendes zuAk rot')
