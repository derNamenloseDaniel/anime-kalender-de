// Test für routine-quellen-sperre.js: node .claude/hooks/routine-quellen-sperre-test.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const { pruefe } = createRequire(import.meta.url)('./routine-quellen-sperre.js')
const quellen = [{ git_repository: { url: 'https://github.com/derNamenloseDaniel/anime-kalender-de' } }]
const ctx = (extra) => ({ allowed_tools: ['Bash'], model: 'claude-sonnet-5-5', sources: quellen, ...extra })
const r = (action, body, tool_name = 'RemoteTrigger') => pruefe({ tool_name, tool_input: { action, body } })
const job = (session_context) => ({ job_config: { ccr: { session_context } } })

assert.equal(r('create', job(ctx())), null, 'create vollständig: frei')
assert.equal(r('update', job(ctx())), null, 'update vollständig: frei')
assert.match(r('create', job({ allowed_tools: ['Bash'], model: 'm' })), /sources/, 'create ohne sources: gesperrt')
assert.match(r('update', job(ctx({ model: undefined }))), /session_context\.model/, 'update ohne model: gesperrt')
assert.match(r('update', job(ctx({ model: '  ' }))), /session_context\.model/, 'model nur Leerraum: gesperrt')
assert.match(r('create', job(ctx({ sources: [] }))), /sources/, 'sources leer: gesperrt')
assert.match(r('create', job(ctx({ sources: [{ type: 'git_repository' }] }))), /sources/, 'sources ohne git_repository.url: gesperrt')
assert.match(r('create', job(ctx({ sources: [{ git_repository: { url: '' } }] }))), /sources/, 'url leer: gesperrt')
assert.match(r('create', job(ctx({ sources: 'x' }))), /sources/, 'sources kein Array: gesperrt')
assert.match(r('create', job(undefined)), /model.*sources/, 'ccr ohne session_context: beide Felder genannt')
const grund = r('create', job({}))
assert.match(grund, /allowed_tools/, 'Grund nennt die Vorlage')
assert.match(grund, /create/, 'Grund nennt die Aktion')
assert.equal(r('update', { enabled: false }), null, 'update nur enabled: frei')
assert.equal(r('update', undefined), null, 'update ohne body: frei')
assert.equal(r('create', { name: 'x', job_config: {} }), null, 'ohne ccr: frei')
for (const a of ['run', 'list', 'get', 'list_runs']) assert.equal(r(a, job({})), null, `${a}: frei`)
assert.equal(r('create', job({}), 'Bash'), null, 'anderes Werkzeug: unberührt')
assert.match(r('create', job({}), 'mcp__x__RemoteTrigger'), /fehlt/, 'Präfix-Name wird erkannt')
assert.equal(pruefe({}), null, 'leere Eingabe: frei')
console.log('routine-quellen-sperre-test: ok')
