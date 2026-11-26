/**
 * Zusicherung zum Sammler der Wikipedia-Sprechertabellen (`lib/wikipedia-sprecher-sammeln.ts`, `lib/wikipedia-sprecher-seite.ts`,
 * `fetch-wikipedia-sprecher.ts`): nur der Abschnitt „Synchron…“ zählt, frische Seiten werden nicht erneut geholt, eine Störung
 * behält den alten Stand, aus der Handliste gefallene Seiten fallen weg; `main` schreibt die Sammlung in die Wurzel.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-wikipedia-sprecher-sammeln.ts`
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { alsText, FRISCH_TAGE, sammle, type Abruf, type SprecherDatei } from './lib/wikipedia-sprecher-sammeln.ts'
import { sprecherAusSeite, synchronAbschnitte, wikipediaAdresse } from './lib/wikipedia-sprecher-seite.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const tabelle = (name: string) => `{| class="wikitable"\n! Rolle !! Deutsche Stimme\n|-\n| Held || ${name}\n|}`
const folgen = '{| class="wikitable"\n! Nr. !! Titel !! Deutsche Erstausstrahlung\n|-\n| 1 || Anfang || 2020\n|}'
const seite = (ueberschrift: string, ebene = 3) => {
  const g = '='.repeat(ebene)
  return `Einleitung\n== Episodenliste ==\n${folgen}\n== Produktion ==\n${g} ${ueberschrift} ${g}\n${tabelle('Anna Alt')}\n== Rezeption ==\n${folgen}\n`
}

console.log('\nWikipedia-Sprecher: Abschnitt')
pruefe('Episodenliste mit „Deutsche Erstausstrahlung“ vor und nach dem Abschnitt zählt nicht', JSON.stringify(sprecherAusSeite(seite('Synchronisation')).zeilen) === '[{"rolle":"Held","deutsch":[{"sprecher":"Anna Alt","zusatz":null}]}]', sprecherAusSeite(seite('Synchronisation')))
pruefe('„Besetzung und Synchronisation“ und „Synchronsprecher“ gelten, Überschrift wird gemeldet', sprecherAusSeite(seite('Besetzung und Synchronisation')).abschnitt === 'Besetzung und Synchronisation' && sprecherAusSeite(seite('Synchronsprecher', 4)).abschnitt === 'Synchronsprecher')
pruefe('ohne Synchron-Abschnitt keine Tabelle, obwohl die Seite eine deutsche Spalte hat', !sprecherAusSeite(seite('Musik')).deutscheSpalte && sprecherAusSeite(seite('Musik')).abschnitt === null)
const verschachtelt = `== Synchronisation ==\nText\n=== Hauptrollen ===\n${tabelle('Bea Bor')}\n== Weiteres ==\n${tabelle('Cem Cor')}`
pruefe('Unterabschnitt gehört dazu, die nächste Überschrift gleicher Ebene beendet', synchronAbschnitte(verschachtelt)[0]?.text.includes('Bea Bor') === true && !synchronAbschnitte(verschachtelt)[0]?.text.includes('Cem Cor'), synchronAbschnitte(verschachtelt))
const ersterOhne = `=== Synchronisation ===\nnur Text\n=== Synchronsprecher ===\n${tabelle('Dirk Dorn')}`
pruefe('erster Synchron-Abschnitt ohne Tabelle: der nächste mit deutscher Spalte zählt', sprecherAusSeite(ersterOhne).zeilen[0]?.deutsch[0]?.sprecher === 'Dirk Dorn' && sprecherAusSeite(ersterOhne).abschnitt === 'Synchronsprecher')
pruefe('Adresse mit Unterstrich und Kodierung', wikipediaAdresse('Ranma ½') === 'https://de.wikipedia.org/wiki/Ranma_%C2%BD')

console.log('\nWikipedia-Sprecher: Sammeln')
const heute = '2026-11-27'
const alt: SprecherDatei = {
  seiten: {
    Frisch: { abgerufen: '2026-11-21', abschnitt: 'Synchronisation', zeilen: [] },
    Alt: { abgerufen: '2026-11-20', abschnitt: 'Synchronisation', zeilen: [{ rolle: 'R', deutsch: [{ sprecher: 'Vorher', zusatz: null }] }] },
    Gestoert: { abgerufen: '2026-10-01', abschnitt: 'Synchronisation', zeilen: [{ rolle: 'R', deutsch: [{ sprecher: 'Bleibt', zusatz: null }] }] },
    Weiter: { abgerufen: '2026-10-01', abschnitt: null, zeilen: [] },
    Entfernt: { abgerufen: '2026-11-26', abschnitt: null, zeilen: [] },
  },
}
const protokoll: string[] = []
const antworten: Record<string, { status: number; text: string } | Error> = {
  Alt: { status: 200, text: seite('Synchronisation') },
  Gestoert: { status: 429, text: '' },
  Weiter: { status: 200, text: '#WEITERLEITUNG [[Ziel]]' },
  Neu: new Error('Netz weg'),
}
const abruf: Abruf = async (s) => {
  protokoll.push(`abruf ${s}`)
  const a = antworten[s]
  if (!a) throw new Error(`unerwartet: ${s}`)
  if (a instanceof Error) throw a
  return a
}
const erg = await sammle(['Frisch', 'Alt', 'Gestoert', 'Weiter', 'Neu'], alt, abruf, heute, async () => void protokoll.push('pause'))
pruefe(`frische Seite (< ${FRISCH_TAGE} Tage) wird nicht geholt, die übrigen mit Pause dazwischen`, protokoll.join(',') === 'abruf Alt,pause,abruf Gestoert,pause,abruf Weiter,pause,abruf Neu', protokoll)
pruefe('Grenze: genau 7 Tage alt wird geholt', FRISCH_TAGE === 7 && protokoll.includes('abruf Alt'))
pruefe('geholte Seite: neues Datum und Zeilen', erg.datei.seiten.Alt?.abgerufen === heute && erg.datei.seiten.Alt.zeilen[0]?.deutsch[0]?.sprecher === 'Anna Alt', erg.datei.seiten.Alt)
pruefe('HTTP 429 behält den alten Stand und meldet', erg.datei.seiten.Gestoert?.zeilen[0]?.deutsch[0]?.sprecher === 'Bleibt' && erg.stoerungen.includes('Gestoert: HTTP 429'), erg.stoerungen)
pruefe('Weiterleitung ist eine Störung, alter Stand bleibt', erg.datei.seiten.Weiter?.abgerufen === '2026-10-01' && erg.stoerungen.some((s) => s.startsWith('Weiter: Weiterleitung')))
pruefe('Netzfehler ohne alten Stand: keine Seite, gemeldet', !('Neu' in erg.datei.seiten) && erg.stoerungen.includes('Neu: Netz weg'))
pruefe('Seite nicht mehr in der Handliste fällt weg, frische bleibt', !('Entfernt' in erg.datei.seiten) && erg.datei.seiten.Frisch === alt.seiten.Frisch)
pruefe('Abrufzahl', erg.abrufe === 4, erg.abrufe)
pruefe('Textform ist gültiges JSON mit demselben Inhalt, eine Zeile je Tabellenzeile', JSON.stringify(JSON.parse(alsText(erg.datei))) === JSON.stringify(erg.datei) && alsText(erg.datei).split('\n').some((z) => z.startsWith('      {"rolle":"Held"')))

console.log('\nWikipedia-Sprecher: main in der Wurzel')
const wurzel = mkdtempSync(join(tmpdir(), 'ak-wikipedia-sprecher-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data'))
writeFileSync(join(wurzel, 'data', 'wikipedia-sprecher-seiten.yaml'), '- seite: Serie A\n  titel:\n    - id: 900001\n- seite: Serie B\n  titel:\n    - id: 900002\n')
const gefragt: string[] = []
const { main } = await import('./fetch-wikipedia-sprecher.ts')
await main(async (s) => {
  gefragt.push(s)
  return { status: 200, text: seite('Synchronisation') }
}, async () => undefined)
const datei = JSON.parse(readFileSync(join(wurzel, 'data', 'wikipedia-sprecher.json'), 'utf8')) as SprecherDatei
pruefe('main fragt jede Seite der Handliste und schreibt die Sammlung', gefragt.join('|') === 'Serie A|Serie B' && Object.keys(datei.seiten).join('|') === 'Serie A|Serie B' && datei.seiten['Serie A']?.zeilen.length === 1, datei)
rmSync(wurzel, { recursive: true, force: true })

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nWikipedia-Sprecher (Sammler): alle Prüfungen ok')
