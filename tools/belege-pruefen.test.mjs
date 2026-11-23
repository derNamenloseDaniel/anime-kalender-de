/* Test des Wachhunds tools/belege-pruefen.mjs: jeder Verstoß einzeln und die zugehörigen Gegenfälle, an einer Wegwerf-Wurzel (er liest relativ zum Arbeitsordner). Ohne Netz, ohne Uhr. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKRIPT = fileURLToPath(new URL('./belege-pruefen.mjs', import.meta.url))
const wurzel = mkdtempSync(join(tmpdir(), 'belege-pruefen-'))
mkdirSync(join(wurzel, 'data'))

const lesung = (am, hash, extra = {}) => ({ am, hash, bild: `bilder/${hash}.png`, qs: 'ok', veroeffentlicht: '2026-09-01', aktualisiert: '2026-09-01', ausgabe: '1', ...extra })
const GEPRUEFT = { geprueft: true, beleg: 'von Hand' }
// Zwei Adressen auf zwei Hosts, je zwei Lesungen mit Wechsel von Hash UND Datum: der Ausgangsstand ohne Verstoß.
const gut = () => ({
  'https://a.example/x': { lesungen: [lesung('2026-10-01', 'h1'), lesung('2026-10-08', 'h2', { aktualisiert: '2026-10-07' })] },
  'https://b.example/y': { lesungen: [lesung('2026-10-02', 'h3'), lesung('2026-10-09', 'h4', { ausgabe: '2' })] },
})
const domainsGut = () => ({ 'a.example': GEPRUEFT, 'b.example': GEPRUEFT })

function lauf(lesungen, domains = domainsGut()) {
  writeFileSync(join(wurzel, 'data/beleg-lesungen.json'), JSON.stringify(lesungen))
  writeFileSync(join(wurzel, 'data/beleg-domains.json'), JSON.stringify(domains))
  const r = spawnSync(process.execPath, [SKRIPT], { cwd: wurzel, encoding: 'utf8' })
  return { status: r.status, aus: r.stdout + r.stderr }
}
const verstoss = (name, g, muster, domains) => {
  const r = lauf(g, domains)
  assert.equal(r.status, 1, `${name}: Exit 1 erwartet\n${r.aus}`)
  assert.match(r.aus, muster, name)
  assert.match(r.aus, /\b1 Verstöße/, `${name}: genau ein Verstoß\n${r.aus}`)
}
const frei = (name, g, domains) => {
  const r = lauf(g, domains)
  assert.equal(r.status, 0, `${name}: Exit 0 erwartet\n${r.aus}`)
  assert.match(r.aus, /in Ordnung/, name)
}

try {
  const basis = lauf(gut())
  assert.equal(basis.status, 0, basis.aus)
  assert.match(basis.aus, /2 Adressen, 4 Lesungen, 2 mit mehr als einer, 0 Wechsel ohne Datumsänderung/)
  assert.match(basis.aus, /4 Bilder geprüft, 0 Altbestand/)

  // Hash-Wechsel ohne Datumswechsel: jedes der drei Daten allein entlastet.
  for (const feld of ['veroeffentlicht', 'aktualisiert', 'ausgabe']) {
    const g = gut()
    g['https://a.example/x'].lesungen[1] = lesung('2026-10-08', 'h2')
    g['https://a.example/x'].lesungen[1][feld] = 'neu'
    frei(`Hash-Wechsel mit neuem ${feld}`, g)
  }
  let g = gut()
  g['https://a.example/x'].lesungen[1] = lesung('2026-10-08', 'h2')
  verstoss('Hash-Wechsel ohne Datum', g, /a\.example\/x 2026-10-08: Text geändert, Daten gleich/)
  g = gut()
  g['https://b.example/y'].lesungen[1] = lesung('2026-10-09', 'h4')
  verstoss('Hash-Wechsel ohne Datum (zweite Adresse)', g, /b\.example\/y 2026-10-09: Text geändert, Daten gleich/)

  // Gleicher Text mit anderem Bild ist ein Verstoß, mit demselben Bild nicht.
  g = gut()
  g['https://a.example/x'].lesungen[1] = lesung('2026-10-08', 'h1', { bild: 'bilder/anders.png' })
  verstoss('gleicher Text, neues Bild', g, /gleicher Text, neues Bild/)
  g = gut()
  g['https://a.example/x'].lesungen[1] = lesung('2026-10-08', 'h1')
  frei('gleicher Text, gleiches Bild', g)

  g = gut()
  g['https://a.example/x'].lesungen[0].datumsabweichung = '2026-08-30'
  verstoss('Datumsabweichung', g, /Kopfzeile nennt 2026-08-30, Seitendaten 2026-09-01/)

  // Zustimmungswand: Bild vorhanden und Bild fehlt sind zwei verschiedene Verstöße.
  g = gut()
  g['https://a.example/x'].lesungen[0].qs = 'wand'
  verstoss('Wand mit Bild', g, /Zustimmungswand, aber das Bild steht noch da/)
  g = gut()
  g['https://a.example/x'].lesungen[0] = lesung('2026-10-01', 'h1', { bild: null, qs: 'wand' })
  verstoss('Wand ohne Bild', g, /Zustimmungswand — kein Beleg, wird neu versucht/)

  // Bild ohne qs: erst ab 06.10.2026 ein Verstoß, davor Altbestand (Grenze genau auf dem Tag).
  g = gut()
  g['https://a.example/x'].lesungen[0] = lesung('2026-10-05', 'h1', { qs: undefined })
  const alt = lauf(g)
  assert.equal(alt.status, 0, alt.aus)
  assert.match(alt.aus, /3 Bilder geprüft, 1 Altbestand ohne Prüfung/)
  g['https://a.example/x'].lesungen[0] = lesung('2026-10-06', 'h1', { qs: undefined })
  verstoss('Bild ohne qs am Stichtag', g, /2026-10-06: Bild ohne Wand-Prüfung \(qs fehlt\)/)

  g = gut()
  g['https://a.example/x'].lesungen[0] = lesung('2026-10-01', 'h1', { bild: '' })
  verstoss('Lesung ohne Bild', g, /Lesung ohne Bild/)

  // Produktseite von aniSearch mit Veröffentlichungsdatum; dieselbe Seite ohne Datum und eine Nicht-Artikel-Seite sind frei.
  g = { 'https://www.anisearch.de/article/1': { lesungen: [lesung('2026-10-01', 'h1')] } }
  verstoss('aniSearch-Artikel mit Datum', g, /anisearch\.de\/article\/1: Produktseite mit Veröffentlichungsdatum/, { 'www.anisearch.de': GEPRUEFT })
  g = { 'https://www.anisearch.de/article/1': { lesungen: [lesung('2026-10-01', 'h1', { veroeffentlicht: null })] } }
  frei('aniSearch-Artikel ohne Datum', g, { 'www.anisearch.de': GEPRUEFT })
  g = { 'https://www.anisearch.de/anime/1': { lesungen: [lesung('2026-10-01', 'h1')] } }
  frei('aniSearch-Seite (kein Artikel) mit Datum', g, { 'www.anisearch.de': GEPRUEFT })

  // Domains: fehlt, nicht geprüft; ungelesene und `_`-Einträge zählen nicht.
  verstoss('Domain fehlt in der Liste', gut(), /b\.example: gelesen, aber nicht in data\/beleg-domains\.json/, { 'a.example': GEPRUEFT })
  verstoss('Domain nicht von Hand geprüft', gut(), /b\.example: wird gelesen, aber noch nicht von Hand geprüft \(Stichprobe offen\)/, {
    'a.example': GEPRUEFT,
    'b.example': { geprueft: false, beleg: 'Stichprobe offen' },
  })
  frei('ungelesene, ungeprüfte und _-Einträge', gut(), { ...domainsGut(), 'c.example': { geprueft: false, beleg: 'x' }, _hinweis: { geprueft: false, beleg: 'x' } })

  // Eine Adresse mit nur einer Lesung zählt nicht als „mehrfach“; ein gelesener `_`-Host bleibt trotz fehlender Prüfung frei.
  g = { ...gut(), 'https://_intern/z': { lesungen: [lesung('2026-10-03', 'h5')] } }
  const einzeln = lauf(g, { ...domainsGut(), _intern: { geprueft: false, beleg: 'x' } })
  assert.equal(einzeln.status, 0, einzeln.aus)
  assert.match(einzeln.aus, /3 Adressen, 5 Lesungen, 2 mit mehr als einer/)

  // Mehrere Verstöße werden alle gezählt.
  g = gut()
  g['https://a.example/x'].lesungen[1] = lesung('2026-10-08', 'h2')
  g['https://b.example/y'].lesungen[1] = lesung('2026-10-09', 'h4')
  const zwei = lauf(g)
  assert.equal(zwei.status, 1)
  assert.match(zwei.aus, /2 Verstöße/)
  assert.match(zwei.aus, /2 Wechsel ohne Datumsänderung/)
} finally {
  rmSync(wurzel, { recursive: true, force: true })
}
console.log('belege-pruefen.test: ok')
