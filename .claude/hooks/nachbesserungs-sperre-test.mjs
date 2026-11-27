// Test für nachbesserungs-sperre.js: node .claude/hooks/nachbesserungs-sperre-test.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const { entscheide, prNummer, pruefe } = createRequire(import.meta.url)('./nachbesserungs-sperre.js')
const urteil = { body: '## Prüfer\nUrteil: **aendern**', created_at: '2026-11-23T17:48:54Z' }
const nachtrag = { body: 'Nachtrag: alle Punkte umgesetzt', created_at: '2026-11-23T17:50:13Z' }
const commit = { sha: 'abcdef1234567', committer: '2026-11-23T17:49:30Z' }

const fall = entscheide(4747, [urteil, nachtrag], [])
assert.equal(fall.erlaubt, false, 'Fall 4747: Nachtrag nach Urteil → deny')
assert.match(fall.grund, /PR 4747 wurde nach dem Prüfer-Urteil schon nachgebessert \(Nachtrag-Kommentar, 2026-11-23T17:50:13Z\)/)
assert.equal(entscheide(1, [urteil, { body: '**Nachtrag** x', created_at: '2026-11-23T18:00:00Z' }], []).erlaubt, false, 'fetter Nachtrag zählt')
assert.equal(entscheide(1, [urteil], [commit]).erlaubt, false, 'Commit nach Urteil → deny')
assert.match(entscheide(1, [urteil], [commit]).grund, /Commit abcdef123/)
assert.equal(entscheide(1, [urteil], []).erlaubt, true, 'ohne Nachtrag und Commit → allow')
assert.equal(entscheide(1, [urteil], [{ ...commit, committer: '2026-11-23T17:00:00Z' }]).erlaubt, true, 'Commit vor Urteil → allow')
assert.equal(entscheide(1, [{ ...nachtrag, created_at: '2026-11-23T17:00:00Z' }, urteil], []).erlaubt, true, 'Nachtrag vor Urteil → allow')
assert.equal(entscheide(1, [nachtrag], [commit]).erlaubt, true, 'ohne Prüfer-Urteil → allow')
assert.equal(entscheide(1, [{ body: 'Urteil: **freigabe**', created_at: urteil.created_at }, nachtrag], [commit]).erlaubt, true, 'Urteil freigabe → allow')
assert.equal(entscheide(1, [], []).erlaubt, true, 'leer → allow')

assert.equal(prNummer('Nachbesserung PR 4747: Punkte'), 4747)
assert.equal(prNummer('Nachbesserung für #4724'), 4724)
assert.equal(prNummer('Neue Aufgabe PR 4747'), null, 'ohne „Nachbesserung“: null')
assert.equal(prNummer('Nachbesserung ohne Nummer'), null)

const rt = (action, body, tool_name = 'RemoteTrigger') => pruefe({ tool_name, tool_input: { action, body } })
assert.equal(rt('run', undefined), null, 'run ohne Body: frei')
assert.equal(rt('list', { prompt: 'Nachbesserung PR 4747' }), null, 'list: frei')
assert.equal(rt('update', { enabled: false }), null, 'update ohne Prompt: frei')
assert.equal(rt('update', { prompt: 'Nachbesserung PR 4747' }, 'Bash'), null, 'anderes Werkzeug: frei')
console.log('nachbesserungs-sperre-test: ok')
