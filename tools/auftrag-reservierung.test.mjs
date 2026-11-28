/**
 * Test für `tools/auftrag-reservierung.mjs`: Doppelgriff mit einer Git-Attrappe, die wie der Cloud-Proxy ein verlorenes Rennen
 * still mit Exit 0 quittiert („Everything up-to-date“). Rot-vorher: der naive Griff ohne Nachlesen lässt beide gewinnen.
 */
import assert from 'node:assert/strict'
import { freigeben, griff, lesen, verlaengern, zweigName } from './auftrag-reservierung.mjs'

/** Gemeinsamer „Server“ plus je Sitzung ein Git-Aufruf; jeder Aufruf gibt einmal den Ablauf ab, damit zwei Sitzungen im Gleichschritt laufen. */
function neuerServer() {
  const refs = new Map()
  const commits = new Map()
  let pushes = 0
  const git = () => {
    let fetchHead = null
    return async (args) => {
      await Promise.resolve()
      const [cmd] = args
      if (cmd === 'ls-remote') {
        const sha = refs.get(args[2])
        return { code: 0, out: sha ? `${sha}\t${args[2]}` : '' }
      }
      if (cmd === 'fetch') { fetchHead = refs.get(args[3]); return { code: fetchHead ? 0 : 1, out: '' } }
      if (cmd === 'rev-parse') return { code: 0, out: fetchHead }
      if (cmd === 'log') return { code: 0, out: commits.get(args[3]).msg }
      if (cmd === 'commit-tree') {
        const p = args.indexOf('-p')
        const msg = args[args.indexOf('-m') + 1]
        const sha = `sha${commits.size}-${msg.length}-${Math.abs([...msg].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`
        commits.set(sha, { parent: p >= 0 ? args[p + 1] : null, msg })
        return { code: 0, out: sha }
      }
      if (cmd === 'push') {
        pushes++
        const [sha, ref] = args[3].split(':')
        const aktuell = refs.get(ref)
        if (aktuell && commits.get(sha).parent !== aktuell) return { code: 0, out: 'Everything up-to-date' } // Proxy-Verhalten bei abgelehntem Push
        refs.set(ref, sha)
        return { code: 0, out: '' }
      }
      throw new Error(`unbekannt: ${args.join(' ')}`)
    }
  }
  return { refs, commits, git, pushZahl: () => pushes }
}

const wer = (sitzung, fristMin = 30) => ({ besitzer: `b-${sitzung}`, sitzung, fristMin })
const T0 = new Date('2026-11-28T10:00:00Z')
const zeit = (min) => () => new Date(T0.getTime() + min * 60_000)
const Z = zweigName('42')
const REF = `refs/heads/${Z}`

// Rot-vorher: naiver Griff vertraut dem Push (Exit 0) und liest nicht nach.
async function naiverGriff(git) {
  const ls = await git(['ls-remote', 'origin', REF])
  const sha = (await git(['commit-tree', 'x', ...(ls.out ? ['-p', ls.out.split('\t')[0]] : []), '-m', `{"n":${Math.random()}}`])).out
  const push = await git(['push', '-q', 'origin', `${sha}:${REF}`])
  return push.code === 0
}
{
  const s = neuerServer()
  const gewinner = (await Promise.all([naiverGriff(s.git()), naiverGriff(s.git())])).filter(Boolean).length
  assert.equal(gewinner, 2, 'naiver Griff: beide glauben zu gewinnen (die Falle)')
}

// Grün-nachher: zwei gleichzeitige Griffe auf neuen Zweig, genau einer gewinnt, Remote-Spitze = sein SHA.
{
  const s = neuerServer()
  const opt = () => ({ git: s.git(), jetzt: zeit(0) })
  const [a, b] = await Promise.all([griff('42', wer('A'), opt()), griff('42', wer('B'), opt())])
  assert.equal([a, b].filter((r) => r.gewonnen).length, 1, 'genau ein Gewinner')
  const sieger = a.gewonnen ? a : b
  const verlierer = a.gewonnen ? b : a
  assert.equal(s.refs.get(REF), sieger.spitze)
  assert.equal(verlierer.grund, 'verloren')
  // Belegt: ein späterer Griff einer dritten Sitzung schreibt nichts.
  const vorher = s.pushZahl()
  const c = await griff('42', wer('C'), { git: s.git(), jetzt: zeit(5) })
  assert.deepEqual([c.gewonnen, c.grund, s.pushZahl()], [false, 'belegt', vorher])
}

// Herzschlag nur für den Besitzer, Frist verlängert sich, Freigabe macht frei, dann greift ein anderer.
{
  const s = neuerServer()
  const o = (min) => ({ git: s.git(), jetzt: zeit(min) })
  assert.equal((await griff('42', wer('A'), o(0))).gewonnen, true)
  assert.equal((await verlaengern('42', wer('B'), o(1))).grund, 'nicht-besitzer')
  assert.equal((await verlaengern('42', wer('A', 60), o(10))).gewonnen, true)
  assert.equal((await lesen('42', o(60))).status, 'belegt') // Frist bis Minute 70
  assert.equal((await lesen('42', o(80))).status, 'abgelaufen')
  assert.equal((await freigeben('42', wer('A'), o(20))).gewonnen, true)
  assert.equal((await lesen('42', o(21))).status, 'frei')
  assert.equal((await griff('42', wer('B'), o(22))).grund, 'griff')
}

// Fristablauf: Übernahme als Kind der Spitze; zwei gleichzeitige Übernehmer, genau einer gewinnt.
{
  const s = neuerServer()
  await griff('42', wer('A'), { git: s.git(), jetzt: zeit(0) })
  const alt = s.refs.get(REF)
  const [b, c] = await Promise.all([griff('42', wer('B'), { git: s.git(), jetzt: zeit(31) }), griff('42', wer('C'), { git: s.git(), jetzt: zeit(31) })])
  assert.equal([b, c].filter((r) => r.gewonnen).length, 1)
  const sieger = b.gewonnen ? b : c
  assert.equal(sieger.grund, 'uebernahme')
  assert.equal(s.commits.get(sieger.spitze).parent, alt, 'Kind der alten Spitze')
}

// Fremder Commit auf dem Zweig: nicht anfassen.
{
  const s = neuerServer()
  s.commits.set('fremd', { parent: null, msg: 'kein JSON' })
  s.refs.set(REF, 'fremd')
  const r = await griff('42', wer('A'), { git: s.git(), jetzt: zeit(0) })
  assert.deepEqual([r.gewonnen, r.grund], [false, 'unlesbar'])
}
// Schlägt commit-tree fehl, wird nichts gepusht (leere Quelle im Push wäre ein Löschen).
{
  const s = neuerServer()
  const echt = s.git()
  let gepusht = 0
  const git = async (args) => {
    if (args[0] === 'commit-tree') return { code: 128, out: '' }
    if (args[0] === 'push') gepusht++
    return echt(args)
  }
  await assert.rejects(griff('42', wer('A'), { git, jetzt: zeit(0) }), /commit-tree fehlgeschlagen/)
  assert.equal(gepusht, 0)
}
console.log('auftrag-reservierung: ok')
