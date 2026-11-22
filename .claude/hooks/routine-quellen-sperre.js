// PreToolUse(RemoteTrigger): create/update mit job_config.ccr braucht session_context.model und .sources (mit git_repository.url).
// Warum: ohne sources scheitert der Push der Cloud-Sitzung mit 403 „not in this session's authorized repository set“, die fertige
// Arbeit ist verloren (Lehre 220, 22.11.2026). update ohne job_config (z. B. nur enabled), run, list und get bleiben frei.
const VORLAGE = 'Vorlage: job_config.ccr.session_context = { allowed_tools: [...], model: "claude-sonnet-5-5", sources: [{ git_repository: { url: "https://github.com/derNamenloseDaniel/anime-kalender-de" } }] }'

const nichtLeer = (s) => typeof s === 'string' && s.trim() !== ''

/** Fehlende Felder von session_context als Liste (leer = vollständig). */
function fehlende(ctx) {
  const fehlt = []
  if (!nichtLeer(ctx?.model)) fehlt.push('session_context.model')
  const quellen = Array.isArray(ctx?.sources) ? ctx.sources : []
  if (!quellen.some((q) => nichtLeer(q?.git_repository?.url))) fehlt.push('session_context.sources (mit git_repository.url)')
  return fehlt
}

/** Grund für die Ablehnung oder null. */
function pruefe(input) {
  if (!/(^|__)RemoteTrigger$/.test(String(input?.tool_name))) return null
  const e = input.tool_input || {}
  if (e.action !== 'create' && e.action !== 'update') return null
  const ccr = e.body?.job_config?.ccr
  if (ccr == null) return null
  const fehlt = fehlende(ccr.session_context)
  if (!fehlt.length) return null
  return `RemoteTrigger ${e.action}: ${fehlt.join(' und ')} fehlt. Ohne sources scheitert der Push der Cloud-Sitzung mit 403, die Arbeit geht verloren. ${VORLAGE}`
}

module.exports = { pruefe }
