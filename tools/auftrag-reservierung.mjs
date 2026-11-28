/**
 * Atomare Reservierung eines Auftrags über einen Git-Zweig `claude/auftrag-<kennung>` (Bau 1 der gemeinsamen Auftragsliste).
 *
 * Jeder Zustand (griff, herzschlag, frei, uebernahme) ist ein Push OHNE Force als Kind-Commit der zuvor gelesenen Spitze; ein Griff auf einen
 * neuen Zweig legt ihn an. GitHub lässt je Zweig genau einen von zwei gleichzeitigen Pushes durch (`cannot lock ref`). Gewonnen hat nur, wessen
 * SHA danach per `ls-remote` die Spitze ist: die Push-Ausgabe zählt nie (der Proxy meldet bei 403 „Everything up-to-date“, Exit 0).
 * Die Commit-Nachricht trägt eine JSON-Zeile {besitzer, sitzung, nonce, zustand, bis}; die Nonce macht jeden SHA einmalig.
 * Löschen geht aus der Cloud nicht (403): „frei“ ist ein weiterer Commit, Räumen später per Workflow.
 */
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const LEERER_BAUM = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
const ident = ['-c', 'user.name=auftrag-reservierung', '-c', 'user.email=auftrag@invalid']
const lauf = promisify(execFile)

/** Echter Git-Aufruf: (args) => { code, out }. Tests setzen eine Attrappe an diese Stelle. */
export async function echtesGit(args) {
  try {
    const { stdout } = await lauf('git', [...ident, ...args], { maxBuffer: 1 << 20 })
    return { code: 0, out: stdout.trim() }
  } catch (e) {
    return { code: typeof e.code === 'number' ? e.code : 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() }
  }
}

export const zweigName = (kennung) => `claude/auftrag-${kennung}`

/** Lesen: { zweig, spitze|null, eintrag|null, status } mit status neu | frei | belegt | abgelaufen | unlesbar. */
export async function lesen(kennung, { git = echtesGit, jetzt = () => new Date() } = {}) {
  const zweig = zweigName(kennung)
  const ls = await git(['ls-remote', 'origin', `refs/heads/${zweig}`])
  if (ls.code !== 0) throw new Error(`ls-remote fehlgeschlagen: ${ls.out}`)
  if (!ls.out) return { zweig, spitze: null, eintrag: null, status: 'neu' }
  const hol = await git(['fetch', '-q', 'origin', `refs/heads/${zweig}`])
  if (hol.code !== 0) throw new Error(`fetch fehlgeschlagen: ${hol.out}`)
  const spitze = (await git(['rev-parse', 'FETCH_HEAD'])).out
  const nachricht = (await git(['log', '-1', '--format=%B', spitze])).out
  let eintrag = null
  try { eintrag = JSON.parse(nachricht.split('\n')[0]) } catch { /* fremder Commit */ }
  if (!eintrag?.zustand) return { zweig, spitze, eintrag: null, status: 'unlesbar' }
  if (eintrag.zustand === 'frei') return { zweig, spitze, eintrag, status: 'frei' }
  const abgelaufen = new Date(eintrag.bis) <= jetzt()
  return { zweig, spitze, eintrag, status: abgelaufen ? 'abgelaufen' : 'belegt' }
}

/** Ein Zustand als Kind der Spitze pushen; gewonnen nur, wenn danach die Remote-Spitze der eigene SHA ist. */
async function schreibe(stand, eintrag, git) {
  const args = ['commit-tree', LEERER_BAUM, ...(stand.spitze ? ['-p', stand.spitze] : []), '-m', JSON.stringify(eintrag)]
  const sha = (await git(args)).out
  await git(['push', '-q', 'origin', `${sha}:refs/heads/${stand.zweig}`])
  const nach = await git(['ls-remote', 'origin', `refs/heads/${stand.zweig}`])
  return { gewonnen: nach.out.split(/\s/)[0] === sha, spitze: sha }
}

const neuerEintrag = (zustand, { besitzer, sitzung, fristMin }, jetzt) => ({
  besitzer, sitzung, nonce: randomBytes(6).toString('hex'), zustand,
  bis: new Date(jetzt().getTime() + fristMin * 60_000).toISOString(),
})

/** Griff: frei, neu, abgelaufen (Übernahme) oder eigene Sitzung → schreiben; belegt durch andere → verloren. */
export async function griff(kennung, wer, { git = echtesGit, jetzt = () => new Date() } = {}) {
  const stand = await lesen(kennung, { git, jetzt })
  if (stand.status === 'unlesbar') return { gewonnen: false, grund: 'unlesbar', stand }
  if (stand.status === 'belegt' && stand.eintrag.sitzung !== wer.sitzung) return { gewonnen: false, grund: 'belegt', stand }
  const zustand = stand.status === 'abgelaufen' && stand.eintrag.sitzung !== wer.sitzung ? 'uebernahme' : 'griff'
  const r = await schreibe(stand, neuerEintrag(zustand, wer, jetzt), git)
  return { gewonnen: r.gewonnen, grund: r.gewonnen ? zustand : 'verloren', stand, spitze: r.spitze }
}

/** Herzschlag/Freigabe nur für den aktuellen Besitzer (eigene Sitzung in der Spitze, nicht frei). */
async function alsBesitzer(kennung, wer, zustand, opt) {
  const { git = echtesGit, jetzt = () => new Date() } = opt
  const stand = await lesen(kennung, { git, jetzt })
  if (!stand.eintrag || stand.status === 'frei' || stand.eintrag.sitzung !== wer.sitzung) return { gewonnen: false, grund: 'nicht-besitzer', stand }
  const r = await schreibe(stand, neuerEintrag(zustand, wer, jetzt), git)
  return { gewonnen: r.gewonnen, grund: r.gewonnen ? zustand : 'verloren', stand, spitze: r.spitze }
}

export const verlaengern = (kennung, wer, opt = {}) => alsBesitzer(kennung, wer, 'herzschlag', opt)
export const freigeben = (kennung, wer, opt = {}) => alsBesitzer(kennung, { ...wer, fristMin: 0 }, 'frei', opt)
