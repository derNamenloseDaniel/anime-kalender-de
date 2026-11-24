/**
 * Test der Optionen-Ablage der Bühne (`web/buehne/optionen.tsx`): Anker im Navigator → `anker`; kein Anker, fremder Ursprung
 * oder kein Rahmen → `streifen` bzw. `oben`; die beiden Rückfälle rendern wie vorher (Streifen mit Taste, oben ohne Hülle).
 * Das Einsetzen in den Anker selbst misst `tools/buehne-seitenleiste-pruefen.mjs` im Browser.
 */
import assert from 'node:assert/strict'
import { renderToString } from 'react-dom/server'
import { Optionen, optionenOrt } from '../web/buehne/optionen.tsx'

const anker = { id: 'optionen-ziel' } as unknown as HTMLElement
const mitDokument = (getElementById: (id: string) => unknown) => ({ document: { getElementById } })

const oben: { parent: unknown } = { parent: null }
oben.parent = oben
assert.deepEqual(optionenOrt(oben), { art: 'oben' }, 'ohne Rahmen: eigene Seite')

const rahmen = { parent: mitDokument((id) => (id === 'optionen-ziel' ? anker : null)) }
assert.deepEqual(optionenOrt(rahmen), { art: 'anker', ziel: anker }, 'Anker da: Portal-Ziel')

assert.deepEqual(optionenOrt({ parent: mitDokument(() => null) }), { art: 'streifen' }, 'Rahmen ohne Anker: Streifen')

const fremd = {
  get parent() {
    throw new DOMException('Blocked a frame', 'SecurityError')
  },
}
assert.deepEqual(optionenOrt({ parent: mitDokument(() => { throw new DOMException('x', 'SecurityError') }) }), { art: 'streifen' }, 'Zugriff verweigert: Streifen')
assert.throws(() => fremd.parent, 'Gegenprobe: der Fremd-Rahmen wirft wirklich')

const inhalt = <p className="notiz">Hinweis</p>
assert.equal(renderToString(<Optionen ort={{ art: 'oben' }}>{inhalt}</Optionen>), '<p class="notiz">Hinweis</p>', 'oben: keine Hülle')
const streifen = renderToString(<Optionen ort={{ art: 'streifen' }}>{inhalt}</Optionen>)
assert.match(streifen, /<aside class="optionen">.*optionen-taste.*optionen-inhalt.*Hinweis/, 'Streifen: aside mit Taste und Inhalt')
console.log('buehne-optionen-ort: ok')
