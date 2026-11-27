/**
 * Suchauftrag „Black Butler" (Daniel, 26.11.2026, v4.32.207): drei Fehler an einer Wurzel — der Kasten las die ganze Seite
 * statt der Treffer und hielt den Auftrag über den Seitenwechsel fest.
 *
 * 1. Auf einer Titelseite fremden Namens blieb der Auftrag (zehn Minuten im `sessionStorage`) stehen.
 * 2. Die Kandidatenliste nahm jede Kachel der Suchseite (Empfehlungsreihen) statt der Namenstreffer.
 * 3. Der Kasten der Suchseite blieb bei SPA-Wechsel auf eine andere Titelseite stehen.
 *
 * Fester Zeitpunkt: kein Test hängt an der Uhr.
 */
const { readFileSync } = require('node:fs')
const vm = require('node:vm')

const quelltext = readFileSync(__dirname + '/amazon.js', 'utf8')
vm.runInThisContext(readFileSync(__dirname + '/prime-treffer-kopf.js', 'utf8'))

const fehler = []
function pruefe(name, bedingung, gefunden) {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
function schneide(name) {
  const start = quelltext.indexOf(`  function ${name}(`)
  if (start < 0) throw new Error(`${name} nicht gefunden`)
  return quelltext.slice(start, quelltext.indexOf('\n  }\n', start) + 4)
}
const kernQuelle = quelltext.slice(quelltext.indexOf('  const titelKern ='), quelltext.indexOf('  /**', quelltext.indexOf('  const wortFolgePasst =')))
const staffelQuelle = quelltext.slice(quelltext.indexOf('  const staffelImTitel ='), quelltext.indexOf('\n  }', quelltext.indexOf('  const staffelImTitel =')) + 4)
const { beurteileTreffer } = new Function([kernQuelle, staffelQuelle, schneide('beurteileTreffer'), 'return { beurteileTreffer }'].join('\n'))()

const karte = (titel, kennung, typ = 'TV Show') => ({ titel, typ, zugang: 'Entitled', url: `/gp/video/detail/${kennung}` })
/* Die Seite aus Daniels Meldung: Treffer und Empfehlungsreihen in einer Kartenliste. */
const SEITE = [
  karte('Black Butler', 'B0BUTLER001'),
  karte('Black Butler II', 'B0BUTLER002'),
  karte('Black Butler: Book of Circus', 'B0BUTLER003'),
  karte('Black Butterfly', 'B0FALSCH001', 'Movie'),
  karte('My Gift Lvl 9999 Unlimited Gacha', 'B0EMPF00001'),
  karte('Die Tagebücher der Apothekerin', 'B0EMPF00002'),
  karte('Jujutsu Kaisen', 'B0EMPF00003'),
  karte('Frieren', 'B0EMPF00004'),
  karte('Re:ZERO', 'B0EMPF00005'),
]
const auftrag = { titel: 'Black Butler', folgen: 24, suchUrl: 'https://www.amazon.de/s?k=Black%20Butler&i=instant-video' }

{
  const b = beurteileTreffer(auftrag, { treffer: SEITE, gesehen: SEITE.length, echte: 4 })
  const kennungen = (b.namensgleich ?? []).map((t) => t.url.split('/').pop())
  pruefe('Black Butler: Staffeln und Teile gelten, Black Butterfly nicht, keine Empfehlung', kennungen.join() === 'B0BUTLER001,B0BUTLER002,B0BUTLER003', kennungen)
  pruefe('„genau" liefert die Namenstreffer mit (auch andere Staffeln)', b.art === 'genau' && b.namensgleich.length >= b.treffer.length, b.art)
}

/* Der Kasten reicht an die Auswahl nur die Namenstreffer, nie die ganze Seite (Mutation: `gefunden` dort → rot). */
pruefe('genauZeigen wählt aus befund.namensgleich', /auswahlGruppe\(auftrag, \{ treffer: befund\.namensgleich \?\? befund\.treffer \}\)/.test(quelltext))
pruefe('der „ähnlich"-Zweig wählt aus befund.treffer, nicht aus der Seite', quelltext.includes('nurAehnlich ? auswahlGruppe(auftrag, { treffer: befund.treffer })'))

/* Fehler 1/3: ohne Zielmarke gilt der Namensvergleich, und ein nicht neu gebauter Kasten der Vorseite wird ersetzt. */
{
  const start = quelltext.indexOf('  function zeigeAuftragshinweis()')
  const rumpf = quelltext.slice(start, quelltext.indexOf('if (imPlayer()) return false', start))
  pruefe('Namensvergleich gilt auch ohne zielAsin', /if \(andereSeite \|\| !auftrag\.zielAsin\) \{[\s\S]*return false/.test(rumpf))
  pruefe('Takt ruft den Helfer mit beiden Bauern und der Hülle', /globalThis\.akPrimeKastenNeu\(alterHinweis, kastenAdresse\(\), location\.pathname, \{ suche: zeigeSuchhinweis, titel: zeigeAuftragshinweis, huelle: /.test(quelltext))
}

/* Der Helfer: auf der Titelseite ohne Auftrag (Bauer tut nichts) wird der Kasten der Suchseite durch die Hülle ersetzt. */
{
  globalThis.document = {}
  vm.runInThisContext(readFileSync(__dirname + '/prime-durchgang-suche.js', 'utf8'))
  const lauf = (pfad, alterAdresse, bauerTutWas) => {
    const rufe = []
    const alter = { isConnected: true, dataset: { fuerAdresse: alterAdresse } }
    const bauer = { suche: () => rufe.push('suche'), titel: () => { rufe.push('titel'); bauerTutWas?.(alter) }, huelle: () => rufe.push('huelle') }
    globalThis.akPrimeKastenNeu(alter, '/gp/video/detail/B0H11D41SV', pfad, bauer)
    return rufe.join()
  }
  pruefe('Titelseite, kein Auftrag: Hülle statt Kandidatenliste der Suchseite', lauf('/gp/video/detail/B0H11D41SV', '/s?k=Black Butler') === 'titel,huelle')
  pruefe('Titelseite, Bauer hat den Kasten neu gebaut: keine zweite Hülle', lauf('/gp/video/detail/B0H11D41SV', '/s?k=Black Butler', (a) => { a.dataset.fuerAdresse = '/gp/video/detail/B0H11D41SV' }) === 'titel')
  pruefe('Suchseite ruft den Suchbauer', lauf('/s', '/s?k=x').startsWith('suche'))
}

/* Verhalten des Namensvergleichs: Black Butler gegen Kaiju (fremd) und gegen Black Butler II (gleich). */
{
  const kernQ = new Function([kernQuelle, 'return titelKern'].join('\n'))()
  const fremd = (a, b) => {
    const x = kernQ(a)
    const y = kernQ(b)
    return Boolean(x && y && !x.includes(y) && !y.includes(x))
  }
  pruefe('Kaiju No. 8 und Dragon Maid sind fremd zu Black Butler', fremd('Black Butler', 'Kaiju No. 8: Mission Recon') && fremd('Black Butler', "Miss Kobayashi's Dragon Maid"))
  pruefe('Black Butler II ist nicht fremd', !fremd('Black Butler', 'Black Butler II'))
}

if (fehler.length) {
  console.error(`\n${fehler.length} Zusicherung(en) rot.`)
  process.exit(1)
}
console.log('Suchauftrag nur mit Namenstreffern und an die Seite gebunden: alle Zusicherungen erfüllt.')
