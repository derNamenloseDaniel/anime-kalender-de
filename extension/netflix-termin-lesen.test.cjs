/**
 * **„Ab 10. Dezember“ wird als Termin gelesen** (26.11.2026, Banana Fish, Daniel): Die Titelseite nannte einen Termin, die Erweiterung
 * meldete „Erinnern-Knopf ohne Datum“ und stellte den Titel 7 Tage zurück. Der Leser verlangte „Ab“ mit großem A; jede andere
 * Schreibung ergab `null` und damit den Grund ohne Datum. Fixture: Texte wie die Seite sie liefert, festes „jetzt“.
 */
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')

const fehler = []
const pruefe = (name, bedingung, gefunden) => {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.log(`  ✗ ${name}${gefunden === undefined ? '' : ` — ${JSON.stringify(gefunden)}`}`)
}
const lies = (datei) => readFileSync(resolve(__dirname, datei), 'utf8')

console.log('Netflix: Termin „Ab <Datum>“ lesen')
const kontext = { globalThis: null }
kontext.globalThis = kontext
vm.createContext(kontext)
for (const d of ['netflix-erinnern.js', 'netflix-durchgang-steuerung.js', 'netflix-zurueckgestellt.js']) vm.runInContext(lies(d), kontext)

const quelle = lies('melder.js')
const von = quelle.search(/^function erscheinungsdatum\(/m)
const code = quelle.slice(von, quelle.indexOf('\n}\n', von) + 2)
const datum = (dialogText, body = '') =>
  new Function('document', 'akNetflixTerminLesen', `${code}; return erscheinungsdatum()`)(
    { body: { innerText: body }, querySelector: () => (dialogText == null ? null : { innerText: dialogText }) },
    kontext.akNetflixTerminLesen,
  )

pruefe('„Ab 10. Dezember“ (Banana Fish)', datum('Banana Fish\nAb 10. Dezember\nErinnern') === '10. Dezember', datum('Banana Fish\nAb 10. Dezember\nErinnern'))
pruefe('„ab 10. Dezember“ kleingeschrieben', datum('ab 10. Dezember Erinnern') === '10. Dezember', datum('ab 10. Dezember Erinnern'))
pruefe('„AB 10. DEZEMBER“ großgeschrieben', datum('AB 10. DEZEMBER') === '10. DEZEMBER', datum('AB 10. DEZEMBER'))
pruefe('Seitentext ohne Dialog', datum(null, 'Ab 3. Oktober 2026') === '3. Oktober 2026', datum(null, 'Ab 3. Oktober 2026'))
pruefe('kein Monat: „ab 5. Folge“ ist kein Termin', datum('Spannend ab 5. Folge') === null, datum('Spannend ab 5. Folge'))
pruefe('ohne Termin', datum('Abspielen 1. Folge') === null)

const grundVon = (text) => kontext.akNetflixErinnernGrund(datum(text))
pruefe('Grund trägt das Datum (nicht „ohne Datum“)', grundVon('Ab 10. Dezember') === 'Erinnern-Knopf mit Datum (10.12.)', grundVon('Ab 10. Dezember'))
pruefe('Grund bei „ab“ klein ebenso', grundVon('ab 10. Dezember') === 'Erinnern-Knopf mit Datum (10.12.)', grundVon('ab 10. Dezember'))

/* Nachbesserung R1: ein erster Treffer ohne Monat darf den echten Termin nicht verdecken */
const alle = [
  ['„Ab 12. Folge“ vor dem Termin', 'Ab 12. Folge Spannend. Ab 10. Dezember', '10. Dezember'],
  ['„Ab 3. Staffel, Ab 10. Dezember“', 'Ab 3. Staffel, Ab 10. Dezember', '10. Dezember'],
  ['„ab 16. Jahren“ davor (Zeilenumbruch)', 'ab 16. Jahren \nAb 10. Dezember', '10. Dezember'],
  ['Dialog mit Billboard-Vorlauf', 'Banana Fish\nAb 16. Jahren · Ab 2. Folge\nAb 10. Dezember\nErinnern', '10. Dezember'],
  ['„Ab 10.12.“ rein numerisch', 'Banana Fish Ab 10.12. Erinnern', '10. Dezember'],
  ['„ab 10.12.2026“ mit Jahr', 'ab 10.12.2026', '10. Dezember 2026'],
  ['„Ab 16.“ allein ist kein Datum', 'Ab 16. Erinnern', null],
  ['„ab 16. Jahren“ allein ist kein Datum', 'ab 16. Jahren', null],
  ['„Ab 31.13.“ unmöglicher Monat', 'Ab 31.13.', null],
  ['„Ab 10.12“ ohne Schlusspunkt ist keins', 'Ab 10.12 Uhr', null],
  ['Grenze: 1.1.', 'Ab 1.1.', '1. Januar'],
  ['Grenze: 31.12.', 'Ab 31.12.', '31. Dezember'],
  ['Grenze: Tag 0', 'Ab 0.12.', null],
  ['Grenze: Tag 32', 'Ab 32.12.', null],
  ['Grenze: Monat 0', 'Ab 10.0.', null],
  ['Grenze: Monat 13', 'Ab 10.13.', null],
]
for (const [name, text, soll] of alle) pruefe(name, datum(text) === soll, datum(text))
pruefe('Dialog geht vor Seitentext (Billboard im Body zählt nicht)', datum('Ab 10. Dezember', 'Ab 1. Januar') === '10. Dezember')
pruefe('Grund bei numerischem Termin trägt das Datum', grundVon('Ab 10.12.') === 'Erinnern-Knopf mit Datum (10.12.)', grundVon('Ab 10.12.'))

/* Frist: bis 10.12. 00:00 Berlin (Winterzeit = 09.12. 23:00 UTC), nicht 7 Tage ab 26.11. */
const JETZT = Date.UTC(2026, 10, 26, 18, 42)
const bis = kontext.akZurueckBis(grundVon('ab 10. Dezember'), kontext.akNetflixDatumKurz('10. Dezember'), JETZT)
pruefe('zurückgestellt bis 10.12. 00:00 Berlin', bis === Date.UTC(2026, 11, 9, 23, 0), new Date(bis).toISOString())

if (fehler.length) {
  console.error(`${fehler.length} Zusicherung(en) gerissen.`)
  process.exit(1)
}
console.log('Alle Zusicherungen zum Termin „Ab <Datum>“ halten.')
