/**
 * Test zu tools/pr-aussehen-betroffen.mjs (Scope-Job der PR-Prüfkette: starten die 19 Aussehen-Jobs?). Feste Eingaben, Attrappe für git und Datei.
 * Die Vollständigkeit der Liste gegen `check:panel` und Co. prüft tools/pr-aussehen-pfade.test.mjs; der Sammeljob (tools/kette-urteil.test.mjs) lässt
 * übersprungene Aussehen-Jobs nur bei `aussehen=0` zu.
 */
import assert from 'node:assert/strict'
import { LISTE_DATEI, ausgabe, betroffen, listeAus } from './pr-aussehen-betroffen.mjs'

const liste = listeAus('# Kopf\n\ntools/a-b.mjs\ntools/c.mjs\n')
assert.deepEqual([...liste], ['tools/a-b.mjs', 'tools/c.mjs'], 'Kommentar- und Leerzeilen zählen nicht')

// Oberfläche und Workflow lösen aus
for (const d of ['web/src/App.tsx', 'web/src/lib/x.ts', 'web/buehne/mockups/a.tsx', 'extension/popup.css', 'extension/sub/x.css', '.github/workflows/pr-pruefung.yml', 'package.json', 'tools/pr-aussehen-pfade.txt', 'tools/pr-aussehen-betroffen.mjs']) {
  assert.equal(betroffen([d], liste), true, `${d} löst aus`)
}
// Alles andere nicht, auch nicht Beinahe-Treffer
for (const d of ['docs/wissen/betrieb.md', 'data/curated/x.yaml', 'worker/src/a.ts', 'extension/popup.js', 'extension/x.css.map', '.github/workflows/pr-pruefung.yml.bak', '.github/workflows/nacht-pruefung.yml', 'web/srcx/a.ts', 'web/buehne', 'package.json5', 'tools/pr-aussehen-betroffen.mjsx', 'tools/pr-aussehen-betroffen.test.mjs', 'tools/andere.mjs', 'tools/c.mjsx', 'xtools/c.mjs']) {
  assert.equal(betroffen([d], liste), false, `${d} löst nicht aus`)
}
// Liste gilt wörtlich: Punkt und Bindestrich sind keine Muster
assert.equal(betroffen(['tools/c.mjs'], liste), true, 'Werkzeug der Liste löst aus')
assert.equal(betroffen(['tools/cxmjs'], liste), false, 'Punkt wörtlich')
assert.equal(betroffen(['tools/aXb.mjs'], liste), false, 'Bindestrich wörtlich')
assert.equal(betroffen([], liste), false, 'keine Änderung löst nichts aus')
assert.equal(betroffen(['docs/a.md', 'tools/c.mjs', 'data/x.yaml'], liste), true, 'eine Datei unter vielen genügt')

// Ausgabezeile: genau 1 oder 0, git-Aufruf mit Basis und Kopf, Liste aus der festen Datei
{
  const aufrufe = []
  const lies = (p) => {
    aufrufe.push(`lies ${p}`)
    return 'tools/c.mjs\n'
  }
  const mit = (zeilen) => (args) => {
    aufrufe.push(args.join(' '))
    return zeilen
  }
  assert.equal(ausgabe('B', 'K', mit('docs/a.md\ntools/c.mjs\n'), lies), 'aussehen=1')
  assert.equal(aufrufe[0], 'diff --name-only B K', 'git diff --name-only <Basis> <Kopf>')
  assert.equal(aufrufe[1], `lies ${LISTE_DATEI}`)
  assert.equal(LISTE_DATEI, 'tools/pr-aussehen-pfade.txt')
  assert.equal(ausgabe('B', 'K', mit('docs/a.md\ndata/x.yaml\n'), lies), 'aussehen=0')
  assert.equal(ausgabe('B', 'K', mit(''), lies), 'aussehen=0', 'leerer Diff: 0, nie eine leere Ausgabe')
  assert.equal(ausgabe('B', 'K', mit('web/src/a.tsx'), () => ''), 'aussehen=1', 'leere Liste, Oberfläche geändert')
  assert.throws(() => ausgabe('B', 'K', () => { throw new Error('git kaputt') }, lies), /git kaputt/, 'Fehler von git schlägt durch (der Scope-Job wird rot, nie „0“)')
  assert.throws(() => ausgabe('B', 'K', mit('a'), () => { throw new Error('Liste fehlt') }), /Liste fehlt/, 'fehlende Liste schlägt durch')
}
console.log('pr-aussehen-betroffen.test: Pfadregel, Liste wörtlich, Ausgabezeile und Fehlerwege grün')
