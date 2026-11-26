/**
 * Zusicherungen zur Ein-Satz-Handlung (`data/curated/ein-satz-handlung/`, 26.11.2026): Lader über alle Teil-Dateien, Strukturprüfung (Länge, doppelte Kennung über Dateien),
 * Bauphase (`satz` neben `de`/`en`), Bestandsprüfung (Titel, Satz ≠ Titel, 5-Wort-Nähe). Läuft in `check:logic`; die echten Dateien gegen den Bestand hält `check-handlung-satz-bestand.ts`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ladeSaetze, satzBestandFehler, satzDateiFehler, SATZ_MAX, teilDateien } from './lib/handlung-satz.ts'
import { ergaenzeSaetze } from './bau/handlung-satz-einbinden.ts'
import { type SynopsisEintrag } from './bau/13-1-anreichern.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  if (!ok) {
    fehler++
    console.error(`FEHLER: ${name} ${info}`)
  }
}

const ordner = mkdtempSync(join(tmpdir(), 'ein-satz-'))
try {
  writeFileSync(join(ordner, 'teil-01.yaml'), `- id: 1\n  satz: Ein Junge sucht seinen Vater.\n  quellen: [Wikipedia, aniSearch]\n  geprueftAm: 2026-11-26\n- id: 2\n  satz: Eine Reihe um zwei Rivalen.\n  quellen: [aniSearch]\n  geprueftAm: 2026-11-26\n  umfang: reihe\n`)
  writeFileSync(join(ordner, 'teil-02.yaml'), `- id: 1\n  satz: Doppelt vergeben.\n  quellen: [Wikipedia]\n  geprueftAm: 2026-11-26\n- id: 3\n  satz: ${'x'.repeat(SATZ_MAX + 1)}\n  quellen: [Wikipedia]\n  geprueftAm: 2026-11-26\n`)
  const dateien = ladeSaetze(ordner)
  pruefe('Lader: liest beide Teil-Dateien, sortiert', dateien.map((d) => d.datei).join() === 'teil-01.yaml,teil-02.yaml' && dateien[0]!.eintraege.length === 2)
  const f = satzDateiFehler(dateien)
  pruefe('Struktur: doppelte Kennung über zwei Dateien wird genannt', f.some((z) => z.startsWith('teil-02.yaml Titel 1') && z.includes('doppelt') && z.includes('teil-01.yaml')), f.join('; '))
  pruefe('Struktur: zu langer Satz wird gemeldet', f.some((z) => z.includes('Titel 3') && z.includes('Zeichen')), f.join('; '))
  pruefe('Struktur: sonst nichts', f.length === 2, f.join('; '))
  pruefe('Struktur: genau die Obergrenze ist erlaubt', satzDateiFehler([{ datei: 'a', eintraege: [{ id: 1, satz: 'y'.repeat(SATZ_MAX), quellen: ['Wikipedia'], geprueftAm: '2026-11-26' }] }]).length === 0)
  pruefe('Struktur: Quellen, Datum und Umfang sind Pflicht', satzDateiFehler([{ datei: 'a', eintraege: [{ id: 1, satz: 's', quellen: [], geprueftAm: 'gestern', umfang: 'staffel' as never }] }]).length === 3)
  pruefe('Lader: fehlender Ordner ist leer', ladeSaetze(join(ordner, 'gibt-es-nicht')).length === 0)

  /* Bau: nur die ersten Einträge ohne Fehler; Reihe wird gekennzeichnet, de/en bleiben. */
  const gut = [dateien[0]!]
  const syn: Record<number, SynopsisEintrag> = { 1: { de: 'Text', en: 'Text en' } }
  const n = ergaenzeSaetze(syn, new Set([1]), gut)
  pruefe('Bau: eingebunden wird nur ein bekannter Titel (Zähler)', n === 1)
  pruefe('Bau: satz steht neben de und en', syn[1]!.satz === 'Ein Junge sucht seinen Vater.' && syn[1]!.de === 'Text' && syn[1]!.en === 'Text en')
  pruefe('Bau: unbekannter Titel bekommt keinen Eintrag', syn[2] === undefined)
  const syn2: Record<number, SynopsisEintrag> = {}
  ergaenzeSaetze(syn2, new Set([1, 2]), gut)
  pruefe('Bau: Titel ohne Synopse bekommt einen Eintrag, Reihe ist gekennzeichnet', syn2[1]!.satz !== undefined && !syn2[1]!.satzReihe && syn2[2]!.satzReihe === true)
  let geworfen = false
  try {
    ergaenzeSaetze({}, new Set([1, 3]), dateien)
  } catch {
    geworfen = true
  }
  pruefe('Bau: eine fehlerhafte Datei bricht den Bau ab', geworfen)

  /* Bestand: Titel fehlt, Satz = Titel, 5 gleiche Wörter mit einem ausgelieferten Text. */
  const titel = new Map([[1, ['Titel Eins']], [2, ['Reihe', 'Eine Reihe um zwei Rivalen']], [4, ['Vier']]])
  const texte = (id: number) => (id === 4 ? [{ name: 'de', text: 'Der Held zieht aus um die Welt zu retten und findet Freunde' }] : [])
  const eintraege = [
    { id: 1, satz: 'Kein Titel, kein Text.', quellen: ['x'], geprueftAm: '2026-11-26' },
    { id: 2, satz: 'Eine Reihe um zwei Rivalen', quellen: ['x'], geprueftAm: '2026-11-26' },
    { id: 3, satz: 'Unbekannt.', quellen: ['x'], geprueftAm: '2026-11-26' },
    { id: 4, satz: 'Er zieht aus um die Welt zu retten.', quellen: ['x'], geprueftAm: '2026-11-26' },
  ]
  const b = satzBestandFehler([{ datei: 'a', eintraege }], titel, texte)
  pruefe('Bestand: Satz gleich Titel, fehlender Titel und Nähe werden gemeldet, Gutes nicht', b.length === 3 && b.some((z) => z.includes('Titel 2') && z.includes('nur der Titel')) && b.some((z) => z.includes('Titel 3') && z.includes('nicht im Bestand')) && b.some((z) => z.includes('Titel 4') && z.includes('gleich mit de')), b.join('; '))
} finally {
  rmSync(ordner, { recursive: true, force: true })
}

/* Reihenfolge der Teil-Dateien: unsortierte Namen kommen sortiert heraus, Fremdes fällt weg. */
pruefe('Lader: Teil-Dateien in fester Reihenfolge', teilDateien(['teil-02.yaml', 'x.txt', 'teil-01.yaml']).join() === 'teil-01.yaml,teil-02.yaml')

/* Verdrahtung: die Bauphase ruft die Einbindung für alle ausgelieferten und verschobenen Titel auf. */
pruefe('Verdrahtung: 13-schreiben.ts bindet die Sätze für slim und verschoben ein', /ergaenzeSaetze\(synopses, new Set\(\[\.\.\.slim, \.\.\.verschoben\]\.map\(\(t\) => t\.id\)\)\)/.test(readFileSync(new URL('./bau/13-schreiben.ts', import.meta.url), 'utf8')))

/* Ausgang des Bestandswächters: Befund → Exit 1 mit Schlusszeile, sauber → Exit 0 (Kulisse über AK_ROOT). */
function bestandLauf(satz: string): { status: number | null; aus: string } {
  const kulisse = mkdtempSync(join(tmpdir(), 'satz-bestand-'))
  try {
    for (const d of ['public/data/synopses', 'data/curated/ein-satz-handlung']) mkdirSync(join(kulisse, d), { recursive: true })
    writeFileSync(join(kulisse, 'public/data/titles.json'), JSON.stringify([{ id: 1, titleDe: 'Titel Eins' }]))
    writeFileSync(join(kulisse, 'public/data/ohne-synchro.json'), '[]')
    writeFileSync(join(kulisse, 'public/data/synopses/1.json'), '{"1":{"de":"Text"}}')
    writeFileSync(join(kulisse, 'data/curated/ein-satz-handlung/teil-01.yaml'), `- id: 1\n  satz: ${satz}\n  quellen: [aniSearch]\n  geprueftAm: 2026-11-26\n`)
    const r = spawnSync('npx', ['tsx', fileURLToPath(new URL('./check-handlung-satz-bestand.ts', import.meta.url))], { env: { ...process.env, AK_ROOT: kulisse }, encoding: 'utf8', timeout: 60000 })
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(kulisse, { recursive: true, force: true })
  }
}
const sauber = bestandLauf('Ein Junge sucht seinen Vater.')
pruefe('Bestandswächter: ohne Befund Exit 0 und Schlusszeile 0', sauber.status === 0 && /^VERSTÖSSE: 0$/m.test(sauber.aus), `${sauber.status} ${sauber.aus.slice(-200)}`)
const befund = bestandLauf('Titel Eins')
pruefe('Bestandswächter: bei Befund Exit 1 und Schlusszeile 1', befund.status === 1 && /^VERSTÖSSE: 1$/m.test(befund.aus), `${befund.status} ${befund.aus.slice(-200)}`)

/* Die echten Dateien: Struktur muss stimmen (Bestand: `check-handlung-satz-bestand.ts`). */
const echt = satzDateiFehler(ladeSaetze())
pruefe('Dateien: data/curated/ein-satz-handlung ist gültig', echt.length === 0, echt.join('; '))

console.log(fehler ? `\nEin-Satz-Handlung: ${fehler} Zusicherung(en) verletzt.` : 'Ein-Satz-Handlung: alle Zusicherungen halten.')
process.exit(fehler ? 1 : 0)
