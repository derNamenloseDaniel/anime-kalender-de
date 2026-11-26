/** Test für tools/handlung-fakten/anisearch-karte.ts: Fakten aus einer Fixture-Seite (HTML-Ausschnitt, nie Netz). */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { ladeFakten, leseFakten } from './handlung-fakten/anisearch-karte.ts'

const html = `<html><head><title>Beispiel-Anime - Anime | aniSearch</title></head><body>
<section id="information"><div class="type"><span class="header">Typ:</span> TV-Serie, 12 Folgen</div>
<div class="company"><span class="header">Studio:</span> Studio <b>Muster</b></div></section>
<section id="genres-tags"><a class="gg showpop" href="#">Action</a><a class="gg showpop" href="#">Action</a><a class="gc showpop" href="#">Comedy</a><a class="gt showpop" href="#">Schule</a></section>
<section id="characters"><a class="title">Held Eins</a><a class="title">Heldin Zwei</a></section>
<section id="description">
<div lang="de" class="textblock">Eine ausreichend lange Beschreibung der Handlung mit mehr als vierzig Zeichen. Source: irgendwer</div>
<div lang="en" class="textblock">Du kennst diesen Anime? Dann schreibe eine Beschreibung dazu, bitte jetzt gleich.</div>
<div lang="fr" class="textblock">zu kurzer Text</div>
</section></body></html>`

const f = leseFakten(html, 77)
assert.equal(f.id, 77)
assert.equal(f.titel, 'Beispiel-Anime - Anime | aniSearch')
assert.deepEqual(f.info, { Typ: 'TV-Serie, 12 Folgen', Studio: 'Studio Muster' })
assert.deepEqual(f.hauptgenres, ['Action'], 'doppelte Genres entfallen')
assert.deepEqual(f.nebengenres, ['Comedy'])
assert.deepEqual(f.tags, ['Schule'])
assert.deepEqual(f.figuren, ['Held Eins', 'Heldin Zwei'])
assert.equal(f.beschreibungen.length, 1, 'Mitmach-Aufruf und Kurztext zählen nicht')
assert.equal(f.beschreibungen[0].sprache, 'de')
assert.ok(!f.beschreibungen[0].text.includes('Source'), 'Quellenzeile entfernt')

const leer = leseFakten('<html></html>', 1)
assert.deepEqual([leer.info, leer.hauptgenres, leer.figuren, leer.beschreibungen], [{}, [], [], []], 'leere Seite: leere Strukturen statt Fehler')

const dir = mkdtempSync(join(tmpdir(), 'anisearch-karte-'))
try {
  writeFileSync(join(dir, '5.html.gz'), gzipSync(html))
  assert.equal(ladeFakten(5, dir)?.titel, f.titel, 'gz-Archiv wird gelesen')
  assert.equal(ladeFakten(6, dir), undefined, 'nicht im Archiv: undefined')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log('handlung-fakten-anisearch-karte.test: ok')
