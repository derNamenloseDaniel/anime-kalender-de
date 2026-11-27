/**
 * Prüft tools/zuordnungsbilanz.mjs mit zwei synthetischen Kopien (Wegwerf-Ordner) im echten Schema (alle
 * Migrationen aus worker/migrations/): neu, umgezogen, verloren, gleich, ohne Kennung, Mehrstaffel-Adresse,
 * Adresse nur in einem Stand, Netflix/Disney+ nur über die Sicht (veraltete Altzeilen zählen nicht), Alterswarnung,
 * Prozesslauf samt Exit-Code.
 * Aufruf: node tools/zuordnungsbilanz.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { alterswarnungen, formatiere, klasseVon, leseZuordnung, main, summen, vergleiche } from './zuordnungsbilanz.mjs'

const ordner = mkdtempSync(join(tmpdir(), 'zuordnungsbilanz-test-'))
const SKRIPT = join(fileURLToPath(import.meta.url), '..', 'zuordnungsbilanz.mjs')
const MIGRATIONEN = join(fileURLToPath(import.meta.url), '..', '..', 'worker', 'migrations')

/** Titelzeile im Format der Sicht: Folge als Feldliste, Index 8 = titel_id. */
const folge = (titelId) => [1, 1, null, null, null, 'ja', 'ja', null, titelId, null, null, null, null, null, null, null]

/**
 * Kopie im echten Schema. Zeilen: [tabelle, plattform, url, titel_id]; Tabelle `titel_zeile` legt eine Titelzeile an
 * (die Sicht `pruefung_titel` liest daraus). Die Migrationen, die `subscribers` brauchen, gehören nicht zur Kopie.
 */
function baueKopie(name, zeilen, stand) {
  const pfad = join(ordner, name)
  const db = new DatabaseSync(pfad)
  try {
    for (const f of readdirSync(MIGRATIONEN).filter((n) => n.endsWith('.sql')).sort()) {
      try {
        db.exec(readFileSync(join(MIGRATIONEN, f), 'utf8'))
      } catch (e) {
        if (!/subscribers/.test(e.message)) throw e
      }
    }
    fuelle(db, zeilen)
    if (stand) {
      db.exec('CREATE TABLE kopie_stand (stand TEXT NOT NULL)')
      db.prepare('INSERT INTO kopie_stand (stand) VALUES (?)').run(stand)
    }
  } finally {
    db.close()
  }
  return pfad
}

function fuelle(db, zeilen) {
  let nr = 0
  for (const [t, p, u, id] of zeilen) {
    if (t === 'pruefung') {
      db.prepare("INSERT INTO pruefung (plattform, url, befund, gemeldet_am, titel_id) VALUES (?, ?, 'dub', '2026-10-01', ?)").run(p, u, id)
    } else if (t === 'prime_folge') {
      // plattform bleibt beim Standard (primevideo), wenn keine Plattform angegeben ist
      if (p) db.prepare("INSERT INTO prime_folge (plattform, url, titel_id, gemeldet_am) VALUES (?, ?, ?, '2026-10-01')").run(p, u, id)
      else db.prepare("INSERT INTO prime_folge (url, titel_id, gemeldet_am) VALUES (?, ?, '2026-10-01')").run(u, id)
    } else {
      const daten = JSON.stringify({ t: 'T', f: id == null ? [] : [folge(id)] })
      db.prepare('INSERT INTO titel_zeile (url, plattform, nr, daten, gemeldet_am) VALUES (?, ?, ?, ?, ?)').run(u, p, ++nr, daten, '2026-10-01')
    }
  }
}

// Feste Uhr: "jetzt" ist 2026-11-18 09:00 UTC; die Kopie vom 17.11. 03:00 UTC ist dann 30 h alt (Befund 18.11.2026).
const JETZT = Date.parse('2026-11-18T09:00:00Z')
const STAND_ALT = '2026-11-10T03:00:00.000Z'
const STAND_NEU = '2026-11-17T03:00:00.000Z'

/** Fährt main im Prozess mit fester Uhr und gibt die gedruckten Zeilen zurück. */
function laufe(argv, jetzt) {
  const gedruckt = []
  const orig = console.log
  console.log = (t) => gedruckt.push(String(t))
  try {
    return { status: main(argv, jetzt), gedruckt }
  } finally {
    console.log = orig
  }
}

try {
  const alt = baueKopie('alt.sqlite', [
    ['pruefung', 'crunchyroll', 'n/gleich', 11],
    ['pruefung', 'crunchyroll', 'n/neu', null],
    ['pruefung', 'crunchyroll', 'n/umgezogen', 21],
    ['pruefung', 'crunchyroll', 'n/verloren', 31],
    ['prime_folge', null, 'p/staffeln', 41],
    ['prime_folge', null, 'p/staffeln', 42],
    ['pruefung', 'crunchyroll', 'n/nur-alt', 51],
    ['pruefung', 'primevideo', 'p/ohne', null],
    // Netflix/Disney+: nur die Sicht zählt, die veralteten Zeilen in pruefung/prime_folge nicht
    ['titel_zeile', 'netflix', 'nz/umzug', 81],
    ['pruefung', 'netflix', 'nz/umzug', 999],
    ['titel_zeile', 'disneyplus', 'dz/verlust', 91],
    ['prime_folge', 'disneyplus', 'dz/verlust', 91],
  ], STAND_ALT)
  const neu = baueKopie('neu.sqlite', [
    ['pruefung', 'crunchyroll', 'n/gleich', 11],
    ['pruefung', 'crunchyroll', 'n/neu', 61],
    ['pruefung', 'crunchyroll', 'n/umgezogen', 22],
    ['pruefung', 'crunchyroll', 'n/verloren', null],
    ['prime_folge', null, 'p/staffeln', 42],
    ['prime_folge', null, 'p/staffeln', 43],
    ['pruefung', 'crunchyroll', 'n/nur-neu', 71],
    ['pruefung', 'primevideo', 'p/ohne', null],
    ['titel_zeile', 'netflix', 'nz/umzug', 82],
    ['pruefung', 'netflix', 'nz/umzug', 999],
    ['titel_zeile', 'disneyplus', 'dz/verlust', null],
    ['prime_folge', 'disneyplus', 'dz/verlust', 91],
  ], STAND_NEU)

  // Plattform-Regel einzeln: Altzeilen von Netflix/Disney+ fallen heraus, die Sicht gilt
  assert.deepEqual([...leseZuordnung(alt).entries()].filter(([k]) => k.includes('nz/')), [['netflix nz/umzug', [81]]])
  assert.deepEqual([...leseZuordnung(neu).entries()].filter(([k]) => k.includes('dz/')), [], 'Sicht ohne Folge, die veraltete prime_folge-Zeile 91 zählt nicht')

  const z = vergleiche(leseZuordnung(alt), leseZuordnung(neu))
  const klasse = Object.fromEntries(z.map((r) => [r.adresse.split(' ')[1], r.klasse]))
  assert.deepEqual(klasse, {
    'dz/verlust': 'verloren',
    'n/gleich': 'gleich',
    'n/neu': 'neu',
    'n/nur-alt': 'verloren',
    'n/nur-neu': 'neu',
    'n/umgezogen': 'umgezogen',
    'n/verloren': 'verloren',
    'nz/umzug': 'umgezogen',
    'p/ohne': 'ohne',
    'p/staffeln': 'umgezogen',
  })
  assert.deepEqual(summen(z), { neu: 2, umgezogen: 3, verloren: 3, gleich: 1, ohne: 1 })
  assert.equal(z.find((r) => r.adresse === 'primevideo p/staffeln').alt.join(), '41,42', 'Menge sortiert, Standardplattform primevideo')
  assert.equal(z.find((r) => r.adresse === 'netflix nz/umzug').neu.join(), '82', 'Sicht, nicht die Altzeile 999')

  // Klassen einzeln, auch die Randfälle leer/leer und umgekehrte Reihenfolge der Argumente
  assert.equal(klasseVon([], []), 'ohne')
  assert.equal(klasseVon([1], [1]), 'gleich')
  assert.equal(klasseVon([], [1]), 'neu')
  assert.equal(klasseVon([1], []), 'verloren')
  assert.equal(klasseVon([1], [2]), 'umgezogen')
  assert.equal(klasseVon([1], [1, 2]), 'umgezogen')

  const text = formatiere(z)
  assert.match(text.split('\n')[0], /^Zuordnungsbilanz: 10 Adressen — neu 2, umgezogen 3, verloren 3, gleich 1, ohne 1$/)
  assert.ok(!text.includes('n/gleich') && !text.includes('p/ohne'), 'gleich und ohne drucken ohne --gleich nicht')
  assert.ok(formatiere(z, true).includes('n/gleich') && formatiere(z, true).includes('p/ohne'))
  assert.match(text, /umgezogen 21 -> 22 {2}crunchyroll n\/umgezogen/)
  assert.match(text, /verloren {2}31 -> - {2}crunchyroll n\/verloren/)

  // Alterswarnung nach Stand: genau an der Grenze keine, eine Stunde drüber eine, beide Kopien einzeln, ohne Stand eine eigene Zeile
  const h = 3600000
  const stand = (stunden) => new Date(JETZT - stunden * h).toISOString()
  assert.deepEqual(alterswarnungen({ a: stand(48), b: stand(0) }, JETZT), [])
  assert.deepEqual(alterswarnungen({ a: stand(49), b: stand(0) }, JETZT), [`⚠ WARNUNG Kopie a (Stand ${stand(49)}) ist 49 h alt (Grenze 48 h)`])
  assert.equal(alterswarnungen({ a: stand(60), b: stand(72) }, JETZT).length, 2)
  assert.deepEqual(alterswarnungen({ a: '', b: stand(1) }, JETZT), ['⚠ WARNUNG Kopie a hat keinen Stand (kopie_stand), Alter unbekannt'])

  // Befund 18.11.2026: Frische zählt am Stand in der Kopie, nicht am Datei-Zeitstempel
  const frisch = laufe([alt, neu, '--gleich'], JETZT)
  assert.equal(frisch.status, 0)
  assert.match(frisch.gedruckt[0], /^⚠ WARNUNG Kopie .*alt\.sqlite \(Stand 2026-11-10T03:00:00\.000Z\) ist 198 h alt \(Grenze 48 h\)$/, 'Datei ist neu, der Stand alt: Warnung')
  assert.match(frisch.gedruckt[1], /^Zuordnungsbilanz: 10 Adressen/)
  assert.equal(frisch.gedruckt.length, 2, 'die Kopie vom 17.11. ist 30 h alt: keine zweite Warnung')
  const zehnTage = new Date(Date.parse('2026-11-08T00:00:00Z'))
  utimesSync(neu, zehnTage, zehnTage)
  assert.equal(laufe([alt, neu], JETZT).gedruckt.filter((z) => z.startsWith('⚠')).length, 1, 'alter Datei-Zeitstempel bei frischem Stand: keine Warnung')
  assert.equal(laufe([alt, neu], Date.parse('2026-11-19T10:00:00Z')).gedruckt.filter((z) => z.startsWith('⚠')).length, 2, 'am 19.11. ist auch der Stand vom 17.11. über 48 h')

  const lauf = spawnSync(process.execPath, ['--no-warnings', SKRIPT, alt, neu, '--gleich'], { encoding: 'utf8', windowsHide: true })
  assert.equal(lauf.status, 0, lauf.stderr)
  assert.match(lauf.stdout, /gleich {4}11 -> 11 {2}crunchyroll n\/gleich/)
  const fehl = spawnSync(process.execPath, ['--no-warnings', SKRIPT, join(ordner, 'fehlt.sqlite'), neu], { encoding: 'utf8', windowsHide: true })
  assert.equal(fehl.status, 2)
  console.log('zuordnungsbilanz.test: 10 Adressen in 5 Klassen, Netflix/Disney+ nur Sicht, Alterswarnung, Prozesslauf und Fehlaufruf ok')
} finally {
  rmSync(ordner, { recursive: true, force: true })
}
