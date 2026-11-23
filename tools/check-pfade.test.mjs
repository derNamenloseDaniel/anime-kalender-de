/* Test des Wächters tools/check-pfade.mjs: er liest `git ls-files` des Arbeitsordners, also läuft das echte Skript in einem Wegwerf-Repo mit festen Dateilisten. Ohne Netz, ohne Uhr. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKRIPT = fileURLToPath(new URL('./check-pfade.mjs', import.meta.url))
const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000 })
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`)
}

/** Legt ein frisches Repo mit genau diesen getrackten Pfaden an, lässt das Skript laufen und räumt auf. */
function lauf(pfade) {
  const wurzel = mkdtempSync(join(tmpdir(), 'check-pfade-'))
  try {
    git(wurzel, 'init', '-q')
    for (const p of pfade) {
      mkdirSync(dirname(join(wurzel, p)), { recursive: true })
      writeFileSync(join(wurzel, p), 'x')
    }
    git(wurzel, 'add', '-A')
    const r = spawnSync(process.execPath, [SKRIPT], { cwd: wurzel, encoding: 'utf8', timeout: 60_000 })
    return { status: r.status, aus: r.stdout, fehler: r.stderr }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

// Länge genau auf der Grenze (180 erlaubt, 181 zu lang): der Dateiname füllt mit verschiedenen Ordnernamen auf.
const mitLaenge = (n) => {
  const kopf = 'u1/u2/u3/'
  return `${kopf}${'f'.repeat(n - kopf.length - 4)}.txt`
}
assert.equal(mitLaenge(180).length, 180)

// Sauber: gleicher Dateiname wie ein Ordner und gleiche Ordner in verschiedenen Zweigen sind erlaubt.
const sauber = lauf(['a/b/c/f.txt', 'x/b/c/g.txt', 'data/data', 'root.txt'])
assert.equal(sauber.status, 0, sauber.fehler)
assert.match(sauber.aus, /Pfade geprüft: 4/)
assert.match(sauber.aus, /✓ Kein Pfad enthält einen Ordnernamen doppelt/)
assert.match(sauber.aus, /✓ Kein Pfad länger als 180 Zeichen/)

// Doppelter Ordnername: direkt hintereinander und mit Abstand; zählt je Pfad einmal und nennt Name, Anzahl und ein Beispiel.
const doppelt = lauf(['data/proposals/proposals/f.json', 'a/b/c/a/g.json', 'data/proposals/proposals/proposals/h.json', 'ok/x/y.txt'])
assert.equal(doppelt.status, 1)
assert.match(doppelt.fehler, /✗ 3 Pfad\(e\) enthalten einen Ordnernamen doppelt/)
assert.match(doppelt.fehler, /„proposals" — 2×/)
assert.match(doppelt.fehler, /„a" — 1×/)
assert.match(doppelt.fehler, /Beispiel: a\/b\/c\/a\/g\.json\n/, "das Beispiel ist der erste Treffer")
assert.match(doppelt.fehler, /cp -r/)
assert.doesNotMatch(doppelt.fehler, /länger als/)
assert.match(doppelt.aus, /Pfade geprüft: 4/)

// Der Dateiname selbst zählt nicht als Ordner: `a/a.txt` und `a/b/b` sind sauber.
assert.equal(lauf(['a/a.txt', 'a/b/b']).status, 0)

// Zu lange Pfade: 180 frei, 181 rot; die Meldung nennt Zahl und Länge, kein Doppelname-Befund.
assert.equal(lauf([mitLaenge(180)]).status, 0, 'genau 180 Zeichen sind erlaubt')
const lang = lauf([mitLaenge(181), mitLaenge(190).replace('u1', 'v1'), 'kurz.txt'])
assert.equal(lang.status, 1)
assert.match(lang.fehler, /✗ 2 Pfad\(e\) länger als 180 Zeichen/)
assert.match(lang.fehler, /181: u1\/u2\/u3\//)
assert.doesNotMatch(lang.fehler, /enthalten einen Ordnernamen doppelt/)
assert.match(lang.aus, /✓ Kein Pfad enthält einen Ordnernamen doppelt/)

// Die Meldung bleibt kurz: höchstens 6 Namen (häufigster zuerst) und 3 lange Pfade; gezählt wird trotzdem alles.
const namen = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7']
const viele = lauf([...namen.map((n) => `${n}/${n}/f.txt`), 'n7/n7/g.txt', 'n7/n7/h.txt', 'n6/n6/g.txt'])
assert.match(viele.fehler, /✗ 10 Pfad\(e\) enthalten/)
assert.match(viele.fehler, /„n7" — 3×\n.*„n6" — 2×\n/, 'häufigster Name zuerst')
assert.doesNotMatch(viele.fehler, /„n5"/, "der siebte Rang fällt aus der Liste (Gleichstand: Reihenfolge der Dateien)")
assert.equal((viele.fehler.match(/„n\d" — /g) ?? []).length, 6)
const vieleLang = lauf([1, 2, 3, 4].map((i) => mitLaenge(181).replace('u1', `v${i}`)))
assert.match(vieleLang.fehler, /✗ 4 Pfad\(e\) länger/)
assert.equal((vieleLang.fehler.match(/^ {4}181: /gm) ?? []).length, 3)
assert.match(vieleLang.fehler, /^ {4}181: .{110}…$/m, 'lange Pfade werden auf 110 Zeichen gekürzt')
// Das Beispiel des Doppelnamens wird auf 120 Zeichen gekürzt.
assert.match(lauf([`d/d/${'f'.repeat(146)}`]).fehler, /^ {2}Beispiel: .{120}$/m)

// Beide Befunde zugleich: beide Meldungen, Exit 1.
const beide = lauf(['p/q/p/f.txt', mitLaenge(185)])
assert.equal(beide.status, 1)
assert.match(beide.fehler, /doppelt/)
assert.match(beide.fehler, /länger als 180/)

console.log('check-pfade.test: ok')
