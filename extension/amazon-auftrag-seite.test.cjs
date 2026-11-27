/**
 * Suchauftrag an die Seite gebunden (Black Butler, 26.11.2026): lässt `zeigeAuftragshinweis()` und den Takt-Zweig
 * (Kasten bei Adresswechsel neu bauen) wirklich laufen — Entscheidung und Verdrahtung, nicht Quelltext-Regex.
 */
const { readFileSync } = require('node:fs')
const vm = require('node:vm')

const quelltext = readFileSync(__dirname + '/amazon.js', 'utf8')
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

/* Entscheidung: bis zum Player-Test kommt der Aufruf nur, wenn der Auftrag zur Seite passt (der Player wirft als Marke). */
const WEITER = new Error('weiter')
function zeige(auftrag, seitenTitel, suchliste = {}, asinJetzt = 'B0SEITE0001') {
  const f = new Function(
    'eintrag', 'suchauftrag', 'reiheMerken', 'zurReihe', 'asin', 'seitenTitel', 'suchliste', 'imPlayer',
    [kernQuelle, schneide('zeigeAuftragshinweis'), 'return zeigeAuftragshinweis'].join('\n'),
  )
  const imPlayer = () => { throw WEITER }
  try {
    return f({ ausSuche: true }, () => auftrag, () => {}, (a, b) => a === b, () => asinJetzt, () => seitenTitel, suchliste, imPlayer)()
  } catch (e) {
    if (e === WEITER) return 'weiter'
    throw e
  }
}
const suchUrl = 'https://www.amazon.de/s?k=Black%20Butler&i=instant-video'
const ohneZiel = { titel: 'Black Butler', folgen: 24, suchUrl }
pruefe('ohne zielAsin, fremder Seitentitel: ausgeblendet', zeige(ohneZiel, 'Jujutsu Kaisen') === false)
pruefe('ohne zielAsin, gleicher Titel: Kasten bleibt', zeige(ohneZiel, 'Black Butler') === 'weiter')
pruefe('ohne zielAsin, erweiterter Titel: Kasten bleibt', zeige(ohneZiel, 'Black Butler: Book of Circus') === 'weiter')
pruefe('ohne zielAsin, anderer Name, aber englischer Suchbegriff passt: Kasten bleibt',
  zeige({ titel: 'Das Geheimnis von Gegege', suchUrl }, 'Mystery of GeGeGe', { [suchUrl]: { suchbegriffEn: 'Mystery of GeGeGe' } }) === 'weiter')
pruefe('ohne zielAsin, kein Name passt (auch Suchbegriffe nicht): ausgeblendet',
  zeige({ titel: 'Das Geheimnis von Gegege', suchUrl }, 'Frieren', { [suchUrl]: { suchbegriffEn: 'Mystery of GeGeGe' } }) === false)
pruefe('mit fremder zielAsin und fremdem Titel: ausgeblendet', zeige({ ...ohneZiel, zielAsin: 'B0ANDERE001' }, 'Frieren') === false)
pruefe('mit passender zielAsin: kein Namensvergleich, Kasten bleibt', zeige({ ...ohneZiel, zielAsin: 'B0SEITE0001' }, 'Frieren') === 'weiter')

/* Takt-Zweig: der Block aus amazon.js, mit Stellvertretern für die Seite. */
const von = quelltext.indexOf("    const alterHinweis = document.querySelector('.ak-amazon-suchhinweis')")
const bis = quelltext.indexOf('    beiStaffelwechsel()', von)
if (von < 0 || bis < 0) throw new Error('Takt-Block nicht gefunden')
globalThis.document = {}
vm.runInThisContext(readFileSync(__dirname + '/prime-durchgang-suche.js', 'utf8'))
globalThis.akPrimeFolgenStand = () => 'stand'
function takt(pfad, alterAdresse, bauerTutWas) {
  const rufe = []
  const alter = { isConnected: true, dataset: { fuerAdresse: alterAdresse, beiFolgen: 'stand', beiErwartungen: 'm' } }
  const f = new Function('document', 'kastenAdresse', 'gesehen', 'location', 'erwartungsMarke', 'zeigeSuchhinweis', 'zeigeAuftragshinweis', 'kastenSkelett',
    quelltext.slice(von, bis))
  f({ querySelector: () => alter }, () => '/gp/video/detail/B0SEITE0001', {}, { pathname: pfad },
    () => 'm',
    () => rufe.push('suche'),
    () => { rufe.push('titel'); bauerTutWas?.(alter) },
    () => ({ classList: { add: (k) => rufe.push(`huelle:${k}`) } }))
  return rufe.join()
}
pruefe('Takt, Titelseite, Adresse neu, kein Auftrag: Titelbauer, dann leere Hülle', takt('/gp/video/detail/B0SEITE0001', '/s?k=Black Butler') === 'titel,huelle:ak-nur-huelle')
pruefe('Takt, Titelseite, Bauer baut neu: keine zweite Hülle', takt('/gp/video/detail/B0SEITE0001', '/s?k=Black Butler', (a) => { a.dataset.fuerAdresse = '/gp/video/detail/B0SEITE0001' }) === 'titel')
pruefe('Takt, Suchseite, Adresse neu: Suchbauer, dann Hülle (Bauer tut nichts)', takt('/s', '/s?k=x') === 'suche,huelle:ak-nur-huelle')
pruefe('Takt, gleiche Adresse, gleicher Stand: nichts wird angefasst', takt('/gp/video/detail/B0SEITE0001', '/gp/video/detail/B0SEITE0001') === '')

if (fehler.length) {
  console.error(`\n${fehler.length} Zusicherung(en) rot`)
  process.exit(1)
}
console.log('amazon-auftrag-seite: grün')
