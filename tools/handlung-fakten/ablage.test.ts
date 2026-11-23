// Test für tools/handlung-fakten/ablage.ts (schreibt vier Dateien je Titel in den Cache): Quelltexte, Schreiben, Lesen. Wegwerf-Ordner als Arbeitsverzeichnis, kein Netz.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KARTEN, leseKarte, leseKartenMarkdown, leseQuelltexte, quelltexteVon, schreibeKarte } from './ablage.ts'
import type { Karte } from './karte.ts'
import type { Fund } from './seiten.ts'
import type { Luecke } from './typen.ts'

const luecke = (geschwister: { id: number; name: string; deText?: string }[]) => ({ id: 900001, geteilt: false, genres: [], studios: [], reiheNamen: [], geschwister }) as unknown as Luecke
const fund = (sprache: string, seite: string, text: string) => ({ sprache, seite, datei: 'x', text, ebene: 'titel' }) as unknown as Fund

// quelltexteVon: Wikipedia-Seiten gesäubert, jede aniSearch-Beschreibung, nur Geschwister mit Text; Reihenfolge Wikipedia, aniSearch, Geschwister
const as = { id: 77, titel: 'T', info: {}, hauptgenres: [], nebengenres: [], tags: [], figuren: [], beziehungen: [], beschreibungen: [{ sprache: 'de', text: 'Deutsch' }, { sprache: 'en', text: 'English' }] }
const funde = [fund('de', 'Alpha', "Der '''Held''' [[Stadt|reist]]<ref>Beleg</ref>."), fund('en', 'Beta', 'Plain {{vorlage}}text')]
const texte = quelltexteVon(luecke([{ id: 1, name: 'Teil Eins', deText: 'Text eins' }, { id: 2, name: 'Teil Zwei' }, { id: 3, name: 'Teil Drei', deText: 'Text drei' }]), funde, as as never)
assert.deepEqual(texte, [
  { name: 'Wikipedia de:Alpha', text: 'Der Held reist.' },
  { name: 'Wikipedia en:Beta', text: 'Plain text' },
  { name: 'aniSearch 77 (de)', text: 'Deutsch' },
  { name: 'aniSearch 77 (en)', text: 'English' },
  { name: 'aniSearch-Text zu „Teil Eins“', text: 'Text eins' },
  { name: 'aniSearch-Text zu „Teil Drei“', text: 'Text drei' },
])
assert.deepEqual(quelltexteVon(luecke([]), [], undefined), [], 'ohne Funde und ohne aniSearch')
assert.equal(quelltexteVon(luecke([]), funde, undefined).length, 2, 'ohne aniSearch nur Wikipedia')

// Schreiben und Lesen im Wegwerf-Ordner
const alt = process.cwd()
const wurzel = mkdtempSync(join(tmpdir(), 'ablage-'))
try {
  process.chdir(wurzel)
  assert.equal(KARTEN, 'data/cache/handlung-fakten/karten')
  const karte = (id: number, name: string): Karte => ({
    id,
    name,
    einordnung: 'titel',
    grund: '3 Sätze über den Titel selbst',
    zaehlung: { quellen: 2, titelSaetze: 3, titelPlot: 2, reiheSaetze: 0 },
    felder: { format: ['TV, 12 Folgen'], figuren: ['Held'], genreTon: ['Abenteuer'] },
    quellen: [{ art: 'wikipedia', ebene: 'titel', name: 'Alpha', url: 'https://de.wikipedia.org/wiki/Alpha', lizenz: 'CC BY-SA' }],
    quellsaetze: [{ quelle: 'Wikipedia de:Alpha', ebene: 'titel', aus: 'Einleitung', saetze: ['Satz eins.'], entfernt: 0 }],
    abrufFehler: [],
  }) as unknown as Karte
  const quellen = [{ name: 'Wikipedia de:Alpha', text: 'Der Held reist.' }, { name: 'aniSearch 77 (de)', text: 'Deutsch' }]
  schreibeKarte(karte(900001, 'Erste Karte'), quellen)
  schreibeKarte(karte(900002, 'Zweite Karte'), [{ name: 'nur eine', text: 'x' }])
  assert.deepEqual(readdirSync(join(wurzel, KARTEN)).sort(), ['900001.json', '900001.md', '900001.quellen.json', '900001.quellsaetze.md', '900002.json', '900002.md', '900002.quellen.json', '900002.quellsaetze.md'])
  // Jede Karte liest ihre eigenen Daten zurück (nicht die der Nachbarkarte)
  assert.equal(leseKarte(900001).name, 'Erste Karte')
  assert.equal(leseKarte(900002).name, 'Zweite Karte')
  assert.deepEqual(leseQuelltexte(900001), quellen)
  assert.deepEqual(leseQuelltexte(900002), [{ name: 'nur eine', text: 'x' }])
  assert.match(leseKartenMarkdown(900001), /^# Erste Karte \(900001\)\nEinordnung: \*\*titel\*\*/)
  assert.match(readFileSync(join(wurzel, KARTEN, '900002.quellsaetze.md'), 'utf8'), /^# Quellsätze zu Zweite Karte \(900002\) – nicht an den Schreiber weitergeben/)
  assert.equal(readFileSync(join(wurzel, KARTEN, '900001.json'), 'utf8'), JSON.stringify(karte(900001, 'Erste Karte'), null, 1), 'Karte mit Einrückung 1')
  // Zweites Schreiben derselben Kennung ersetzt, Nachbar bleibt
  schreibeKarte(karte(900001, 'Erste Karte neu'), [])
  assert.equal(leseKarte(900001).name, 'Erste Karte neu')
  assert.deepEqual(leseQuelltexte(900001), [])
  assert.equal(leseKarte(900002).name, 'Zweite Karte')
  // Lesen einer fehlenden Karte wirft
  assert.throws(() => leseKarte(900003), /ENOENT/)
  assert.ok(!existsSync(join(wurzel, KARTEN, '900003.json')))
} finally {
  process.chdir(alt)
  rmSync(wurzel, { recursive: true, force: true })
}

console.log('ablage.test.ts ok')
