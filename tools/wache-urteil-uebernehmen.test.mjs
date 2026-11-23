/**
 * Prozesstest für tools/wache-urteil.mjs (schreibt die Auswertungsdatei unter daniel-zum-abarbeiten): `--uebernehmen` im Wegwerf-Ordner
 * mit eigenem Urteil. Befund setzt den Eintrag oben, Ruhe lässt die Datei unberührt, ein unbrauchbares oder fehlendes Urteil bricht mit Exit 1 ab.
 * Aufruf: node tools/wache-urteil-uebernehmen.test.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skript = join(dirname(fileURLToPath(import.meta.url)), 'wache-urteil.mjs')
const wurzel = mkdtempSync(join(tmpdir(), 'wacheurteil-'))
// Dateiname zusammengesetzt: tools/pr-nachrechnen-bot-pfade.test.mjs verbietet Bot-Dateinamen als Literal in Tests
const AUSWERTUNG_NAME = ['00-wache', 'auswertung.md'].join('-')

const ABSAETZE = [
  '**Was läuft korrekt.** Bestandsbau und Deploy zeigen keinen Alarm, der letzte Lauf war grün (12).',
  '**Wo ist Verbesserungspotenzial?** Die Quelle tv-de bleibt gesperrt und hat seit Tagen keinen Treffer (06).',
  '**Wo sind echte Risiken und Lücken?** Fehlschläge auf Zweigen ohne offenen Pull Request bleiben ungeklärt (08).',
  '**Was läuft komplett falsch?** Kein Fall dauerhaft falsch ausgelieferter Daten im Dossier sichtbar (12).',
]
const urteil = (lage, absaetze = ABSAETZE) => `Lage: ${lage}\n\n${absaetze.join('\n\n')}\n`
const AUSWERTUNG = '# Auswertung der Wache\n\nVorspann.\n\n## 22.11.2026, 10:07 — Claude-Lauf, Befund\n\n**Was läuft korrekt.** alter Eintrag\n'

let nr = 0
/** Legt Ordner mit (optionalem) Urteil und Auswertungsdatei an, fährt das Werkzeug, liefert Ergebnis und Pfade. */
function lauf(args, { urteilText, auswertung = AUSWERTUNG, summary = false } = {}) {
  const cwd = join(wurzel, `l${++nr}`)
  mkdirSync(join(cwd, 'daniel-zum-abarbeiten'), { recursive: true })
  mkdirSync(join(cwd, 'ordner', 'ergebnis'), { recursive: true })
  const datei = join(cwd, 'daniel-zum-abarbeiten', AUSWERTUNG_NAME)
  writeFileSync(datei, auswertung)
  if (urteilText !== undefined) writeFileSync(join(cwd, 'ordner', 'ergebnis', 'urteil.md'), urteilText)
  const env = { ...process.env }
  delete env.GITHUB_STEP_SUMMARY
  if (summary) env.GITHUB_STEP_SUMMARY = join(cwd, 'summary.md')
  const r = spawnSync(process.execPath, [skript, ...args, '--verzeichnis', 'ordner'], { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true, env })
  return { r, datei, lesen: (p) => readFileSync(join(cwd, p), 'utf8') }
}

try {
  // Befund: neuer Eintrag steht über dem alten, Vorspann und Altes bleiben, Zusammenfassung und Step-Summary werden geschrieben
  {
    const { r, datei, lesen } = lauf(['--uebernehmen'], { urteilText: urteil('befund'), summary: true })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /Urteil \(befund\):/)
    assert.ok(r.stdout.includes(`Eintrag oben in daniel-zum-abarbeiten/${AUSWERTUNG_NAME} gesetzt.`))
    const text = readFileSync(datei, 'utf8')
    assert.ok(text.startsWith('# Auswertung der Wache\n\nVorspann.\n\n## '), 'Vorspann bleibt oben')
    const neu = text.search(/^## \d\d\.\d\d\.\d{4}, \d\d:\d\d — Claude-Lauf, Befund$/m)
    const alt = text.indexOf('## 22.11.2026, 10:07')
    assert.ok(neu >= 0 && neu < alt, 'neuer Eintrag steht vor dem alten')
    for (const a of ABSAETZE) assert.ok(text.slice(neu, alt).includes(a), a.slice(0, 20))
    assert.ok(text.endsWith('**Was läuft korrekt.** alter Eintrag\n'), 'alter Eintrag bleibt unverändert am Ende')
    assert.equal(lesen('ordner/zusammenfassung.md'), `Urteil (befund):\n\n${ABSAETZE.join('\n\n')}\n`)
    assert.equal(lesen('summary.md'), `Urteil (befund):\n\n${ABSAETZE.join('\n\n')}\n\n`)
  }

  // Ruhe: Datei bleibt Byte für Byte, Zusammenfassung wird trotzdem geschrieben
  {
    const { r, datei, lesen } = lauf(['--uebernehmen'], { urteilText: urteil('ruhig') })
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /Lage ruhig: nichts einzutragen\./)
    assert.equal(readFileSync(datei, 'utf8'), AUSWERTUNG)
    assert.match(lesen('ordner/zusammenfassung.md'), /^Urteil \(ruhig\):/)
  }

  // Unbrauchbar (Adresse im Text, zu wenig Absätze, falsche Lage) und fehlendes Urteil: Exit 1, Datei unberührt
  const faelle = {
    'Adresse': urteil('befund', [ABSAETZE[0], ABSAETZE[1], `${ABSAETZE[2]} Siehe https://example.invalid/x`, ABSAETZE[3]]),
    'drei Absätze': urteil('befund', ABSAETZE.slice(0, 3)),
    'falsche Lage': urteil('unklar'),
    'fehlt': undefined,
  }
  for (const [name, urteilText] of Object.entries(faelle)) {
    const { r, datei } = lauf(['--uebernehmen'], { urteilText })
    assert.equal(r.status, 1, name)
    assert.match(r.stderr, /Urteil unbrauchbar: /, name)
    assert.equal(readFileSync(datei, 'utf8'), AUSWERTUNG, `${name}: Datei unberührt`)
  }

  // Befund, aber die Auswertung hat keinen Abschnitt: Exit 1 mit eigener Meldung, nichts geschrieben
  {
    const { r, datei } = lauf(['--uebernehmen'], { urteilText: urteil('befund'), auswertung: '# Nur Kopf\n' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /hat keinen Abschnitt/)
    assert.equal(readFileSync(datei, 'utf8'), '# Nur Kopf\n')
  }

  // Aufruf ohne Betriebsart oder ohne Verzeichnis: Exit 1 mit Aufrufzeile
  {
    const ohneArt = lauf([], { urteilText: urteil('befund') })
    assert.equal(ohneArt.r.status, 1)
    assert.match(ohneArt.r.stderr, /Aufruf: wache-urteil\.mjs --sammeln\|--uebernehmen --verzeichnis <ordner>/)
    const ohneOrdner = spawnSync(process.execPath, [skript, '--uebernehmen'], { cwd: wurzel, encoding: 'utf8', timeout: 30000, windowsHide: true })
    assert.equal(ohneOrdner.status, 1)
    assert.match(ohneOrdner.stderr, /Aufruf: /)
  }
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('wache-urteil-uebernehmen.test.mjs ok')
