/* Test des Wächters tools/check-cache-abhaengigkeit.mjs: er findet seine Wurzel über den eigenen Ort, also läuft eine Kopie in einer Wegwerf-Wurzel mit eigenem Register und eigenen Quelldateien. Ohne Netz, ohne Uhr. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ORIGINAL = fileURLToPath(new URL('./check-cache-abhaengigkeit.mjs', import.meta.url))
const eintrag = (extra = {}) => ({ schreiber: 'pipeline/x.ts', laeufe: ['lauf.yml'], intervall: 'täglich', fehlt: 'Titel ohne Cover', bauBraucht: false, ...extra })

/** Baut die Wurzel (alle vier Suchordner existieren), lässt die Kopie laufen und räumt auf. */
function lauf(register, quellen) {
  const wurzel = mkdtempSync(join(tmpdir(), 'cache-abh-'))
  try {
    for (const o of ['pipeline', 'shared', 'tools', '.github']) mkdirSync(join(wurzel, o))
    mkdirSync(join(wurzel, 'data'))
    copyFileSync(ORIGINAL, join(wurzel, 'tools/check-cache-abhaengigkeit.mjs'))
    writeFileSync(join(wurzel, 'data/cache-register.json'), JSON.stringify({ dateien: register }))
    for (const [pfad, text] of Object.entries(quellen)) {
      mkdirSync(dirname(join(wurzel, pfad)), { recursive: true })
      writeFileSync(join(wurzel, pfad), text)
    }
    const r = spawnSync(process.execPath, [join(wurzel, 'tools/check-cache-abhaengigkeit.mjs')], { encoding: 'utf8' })
    return { status: r.status, aus: r.stdout, fehler: r.stderr }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}
const fehlerzeilen = (r) => r.fehler.split('\n').filter((z) => z.startsWith('✗'))

// Sauber: Fundstellen in allen vier Ordnern und mehreren Endungen (ts, mjs, yml, sh), zwei Einträge, einer vom Bau gebraucht.
const reg2 = { 'a.json': eintrag({ bauBraucht: true }), 'b.json': eintrag(), 'c.json': eintrag() }
const quellen2 = {
  'pipeline/x.ts': "const a = 'data/cache/a.json'\n",
  'shared/y.mjs': "readFileSync('data/cache/b.json')\n",
  '.github/workflows/w.yml': 'path: data/cache/c.json\n',
}
const ok = lauf(reg2, quellen2)
assert.equal(ok.status, 0, ok.fehler)
assert.match(ok.aus, /✓ Cache-Register: 3 Cache-Einträge, alle eingetragen \(1 vom Bau gebraucht\)/)
// Endungen: .sh und .js zählen, .md und .txt nicht (die Datei fehlte dann im Register, das Ergebnis bliebe grün).
assert.equal(lauf({ 'd.json': eintrag() }, { 'tools/z.sh': 'cp data/cache/d.json .\n' }).status, 0, '.sh wird gelesen')
assert.equal(lauf({ 'd.json': eintrag() }, { 'pipeline/z.js': 'x("data/cache/d.json")\n' }).status, 0, '.js wird gelesen')
assert.equal(lauf({ 'd.json': eintrag() }, { 'pipeline/z.yaml': 'p: data/cache/d.json\n' }).status, 0, '.yaml wird gelesen')
assert.equal(lauf({ 'd.json': eintrag() }, { 'pipeline/z.cjs': 'x("data/cache/d.json")\n' }).status, 0, '.cjs wird gelesen')
assert.equal(lauf({}, { 'pipeline/notiz.md': 'data/cache/e.json\n', 'pipeline/t.txt': 'data/cache/e.json\n' }).status, 0, '.md und .txt bleiben draußen')

// Nicht eingetragene Datei: Meldung nennt Datei, Fundstelle mit Zeilennummer (erste Stelle) und die Frage nach dem Schreiber.
const fehlt = lauf({ 'a.json': eintrag() }, { 'pipeline/x.ts': "// Kopf\nconst a = 'data/cache/a.json'\n", 'shared/y.ts': "\nx\nconst q = `data/cache/neu.json`\n", 'tools/z.mjs': "f('data/cache/neu.json')\n" })
assert.equal(fehlt.status, 1)
assert.deepEqual(fehlerzeilen(fehlt).length, 1)
assert.match(fehlt.fehler, /✗ data\/cache\/neu\.json fehlt in data\/cache-register\.json \(shared\/y\.ts:3\)\. Wer schreibt sie/)

// Eintrag ohne Fundstelle.
const tot = lauf({ ...reg2, 'alt.json': eintrag() }, quellen2)
assert.equal(tot.status, 1)
assert.deepEqual(fehlerzeilen(tot), ['✗ Registereintrag alt.json hat keine Fundstelle im Code mehr — streichen.'])

// Kommentarzeilen nennen Dateien, ohne sie zu lesen (jede Kommentarform, auch eingerückt); nach Code in derselben Zeile zählt es.
const kommentare = {
  'pipeline/k.ts': '// data/cache/k1.json\n  // data/cache/k2.json\n * data/cache/k3.json\n/* data/cache/k4.json\n# data/cache/k5.json\nconst s = 1\n',
}
assert.equal(lauf({}, kommentare).status, 0, 'nur Kommentare: nichts gefunden')
const nurKommentar = lauf({ 'k1.json': eintrag() }, kommentare)
assert.deepEqual(fehlerzeilen(nurKommentar), ['✗ Registereintrag k1.json hat keine Fundstelle im Code mehr — streichen.'])
assert.equal(lauf({ 'k6.json': eintrag() }, { 'pipeline/k.ts': 'f() // liest data/cache/k6.json\n' }).status, 0, 'Kommentar hinter Code zählt als Fundstelle')

// Ordner ohne Endung zählen nur vor einem Anführungszeichen (`'data/cache/ordner'`), nicht als Pfadanfang (`data/cache/ordner/x`).
assert.equal(lauf({}, { 'pipeline/o.ts': "const p = join('data/cache/ordner/', f)\nconst q = 'data/cache/ordner/' + f\n" }).status, 0, 'Pfadanfang eines Ordners ist keine Datei')
const ordner = lauf({}, { 'pipeline/o.ts': "const p = 'data/cache/ordner'\n" })
assert.equal(ordner.status, 1)
assert.match(ordner.fehler, /✗ data\/cache\/ordner fehlt in data\/cache-register\.json \(pipeline\/o\.ts:1\)/)
for (const anf of ['"', '`']) assert.equal(lauf({}, { 'pipeline/o.ts': `const p = ${anf}data/cache/ordner${anf}\n` }).status, 1, `Anführungszeichen ${anf} beendet den Ordnernamen`)

// Ausgenommen: node_modules (in jedem Ordner), tools/archiv und die Wächterdatei selbst (sie nennt `data/cache/` in Beispielen).
assert.equal(lauf({}, { 'pipeline/node_modules/p/i.js': 'x("data/cache/n.json")\n', 'tools/archiv/alt.mjs': "x('data/cache/n.json')\n" }).status, 0)
assert.equal(lauf({ 'n.json': eintrag() }, { 'tools/archiv/alt.mjs': "x('data/cache/n.json')\n" }).status, 1, 'tools/archiv liefert keine Fundstelle')

// Jedes Pflichtfeld einzeln; „laeufe“ leer oder kein Array; „bauBraucht“ kein Boolean (auch „false“ als Text oder fehlend).
const mit = (extra) => lauf({ 'a.json': eintrag(extra) }, { 'pipeline/x.ts': "'data/cache/a.json'\n" })
for (const feld of ['schreiber', 'intervall', 'fehlt']) {
  const r = mit({ [feld]: '' })
  assert.equal(r.status, 1, feld)
  assert.deepEqual(fehlerzeilen(r), [`✗ Registereintrag a.json: Feld "${feld}" fehlt.`])
  assert.deepEqual(fehlerzeilen(mit({ [feld]: undefined })), [`✗ Registereintrag a.json: Feld "${feld}" fehlt.`], `${feld} fehlt ganz`)
}
for (const laeufe of [[], 'lauf.yml', undefined]) {
  const r = mit({ laeufe })
  assert.equal(r.status, 1, JSON.stringify(laeufe))
  assert.deepEqual(fehlerzeilen(r), ['✗ Registereintrag a.json: "laeufe" leer — ohne Lauf wird die Datei nie befüllt.'])
}
for (const bauBraucht of ['false', 0, undefined, null]) {
  const r = mit({ bauBraucht })
  assert.equal(r.status, 1, String(bauBraucht))
  assert.deepEqual(fehlerzeilen(r), ['✗ Registereintrag a.json: "bauBraucht" muss true oder false sein.'])
}
assert.equal(mit({ bauBraucht: true }).status, 0)

// Mehrere Fehler zugleich werden alle gemeldet (Exit 1, nicht beim ersten abgebrochen).
const viele = lauf({ 'a.json': eintrag({ schreiber: '', laeufe: [] }), 'alt.json': eintrag() }, { 'pipeline/x.ts': "'data/cache/a.json' + 'data/cache/neu.json'\n" })
assert.equal(viele.status, 1)
assert.equal(fehlerzeilen(viele).length, 4)
assert.doesNotMatch(viele.aus, /✓/, 'bei Fehlern keine Erfolgszeile')

console.log('check-cache-abhaengigkeit.test: ok')
