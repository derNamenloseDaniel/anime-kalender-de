// PreToolUse(RemoteTrigger): run/update einer Nachbesserungs-Routine nur, wenn der PR nach dem Prüfer-Urteil „ändern“ noch nicht
// nachgebessert wurde. Warum: die Auto-fix-Originalsitzung bessert selbst nach; eine zweite Routine arbeitet doppelt (Lehre 233, PR 4724/4747).
// Netzfehler, fehlendes gh oder kein erkennbarer PR: durchlassen, nie blockieren, wenn nicht geprüft werden kann.
const { execFileSync } = require('child_process')
const REPO = 'derNamenloseDaniel/anime-kalender-de'

/** Entscheidung aus Kommentaren ({body, created_at}) und Commits ({sha, committer}); rein, ohne Netz. */
function entscheide(pr, kommentare, commits) {
  const urteile = kommentare.filter((k) => /Urteil:\s*\**\s*aendern/i.test(k.body || ''))
  if (!urteile.length) return { erlaubt: true }
  const urteil = Math.max(...urteile.map((k) => Date.parse(k.created_at)))
  const nachher = [
    ...kommentare.filter((k) => /^\s*\**\s*Nachtrag/.test(k.body || '') && Date.parse(k.created_at) > urteil).map((k) => ({ kopf: 'Nachtrag-Kommentar', zeit: k.created_at })),
    ...commits.filter((c) => Date.parse(c.committer) > urteil).map((c) => ({ kopf: `Commit ${String(c.sha).slice(0, 9)}`, zeit: c.committer })),
  ]
  if (!nachher.length) return { erlaubt: true }
  const z = nachher.sort((a, b) => Date.parse(a.zeit) - Date.parse(b.zeit))[0]
  return { erlaubt: false, grund: `PR ${pr} wurde nach dem Prüfer-Urteil schon nachgebessert (${z.kopf}, ${z.zeit}) — erst den Nachtrag gegen die Liste abnehmen, keine zweite Nachbesserung (Lehre 233).` }
}

/** PR-Nummer, wenn der Text eine Nachbesserung für einen PR beschreibt, sonst null. */
function prNummer(text) {
  if (!/Nachbesserung/.test(text)) return null
  const m = /PR\s*#?(\d{3,6})|#(\d{3,6})/.exec(text)
  return m ? Number(m[1] || m[2]) : null
}

function api(pfad) {
  return JSON.parse(execFileSync('gh', ['api', '--paginate', '--slurp', pfad], { encoding: 'utf8', timeout: 20000 })).flat()
}

/** Grund für die Ablehnung oder null. */
function pruefe(input) {
  if (!/(^|__)RemoteTrigger$/.test(String(input?.tool_name))) return null
  const e = input.tool_input || {}
  if (e.action !== 'run' && e.action !== 'update') return null
  if (e.body == null) return null
  const pr = prNummer(JSON.stringify(e.body))
  if (!pr) return null
  try {
    const kommentare = api(`repos/${REPO}/issues/${pr}/comments`)
    const commits = api(`repos/${REPO}/pulls/${pr}/commits`).map((c) => ({ sha: c.sha, committer: c.commit?.committer?.date }))
    const r = entscheide(pr, kommentare, commits)
    return r.erlaubt ? null : r.grund
  } catch (err) {
    process.stderr.write(`nachbesserungs-sperre: nicht geprüft (${String(err.message).split('\n')[0]})\n`)
    return null
  }
}

module.exports = { pruefe, entscheide, prNummer }
