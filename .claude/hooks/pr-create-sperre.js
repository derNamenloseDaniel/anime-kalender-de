// PreToolUse(Bash): `gh pr create` wird abgewiesen; ein PR geht nur über `bash tools/pr-einreichen.sh "<Titel>"`, das die Vorprüfung fährt.
// Anlass: Lehre 232 (23.11.2026): PR 4738 kam mit rohem `gh pr create`, die Kette war rot an der Patch-Notes-Pflicht; dasselbe schon 25.10.2026 (PR 2056).
// Der Hook sieht nur den äußeren Befehl: `bash tools/pr-einreichen.sh …` enthält den Text `gh pr create` nicht und bleibt frei,
// auch wenn das Skript ihn intern aufruft. Andere `gh pr`-Befehle (view, merge, comment, checks, edit) bleiben frei.
// Zerlegung wie in merge-riegel.js (Heredocs weg, Ketten, `bash -c`/`eval` rekursiv); `echo`/`printf`-Text zählt nicht.
// Nur dort, wo `tools/pr-einreichen.sh` existiert (Ziel: `--repo/-R`, sonst `cd`-Ziel davor, sonst `cwd` der Eingabe; Anlass: chrome-utilities, 23.11.2026).
// Bekannte Grenzen: Programm aus Variable (`$g pr create`), `gh`-Alias, PR über `gh api` oder GitHub-MCP.
const fs = require('node:fs')
const path = require('node:path')
const { zerlege, ohneHeredoc, eingebetteterBefehl, programmName } = require('./hauptordner-sperre.js')

/** `gh`-Optionen vor dem Unterbefehl, die einen Wert im nächsten Token nehmen. */
const GH_MIT_WERT = new Set(['-R', '--repo', '--hostname'])

/** Das Repo, dessen PRs `tools/pr-einreichen.sh` einreichen (nur dort greift die Sperre; Anlass 23.11.2026: chrome-utilities hat das Skript nicht). */
const EIGENES_REPO = 'dernamenlosedaniel/anime-kalender-de'
const WURZEL = path.resolve(__dirname, '..', '..')

/** `gh pr create` ab dem `gh`-Token `von`: { repo } (Wert von --repo/-R oder null) oder null, wenn es keins ist. */
function prCreate(tokens, von) {
  let repo = null
  let i = von + 1
  for (; i < tokens.length; i++) {
    const t = tokens[i]
    if (GH_MIT_WERT.has(t)) {
      if (t !== '--hostname') repo = tokens[i + 1] ?? null
      i++
    } else if (t.startsWith('--repo=')) repo = t.slice('--repo='.length)
    else if (!t.startsWith('-')) break
  }
  return tokens[i] === 'pr' && tokens[i + 1] === 'create' ? { repo } : null
}

/** Neues Arbeitsverzeichnis nach `cd <ziel>` ab `von`; nicht bestimmbare Ziele (`$X`, `~`, leer) lassen es unverändert. */
function nachCd(von, ziel) {
  if (!ziel || /[$`~*?]/.test(ziel)) return von
  return path.resolve(von, ziel.replace(/^\/([a-zA-Z])\//, '$1:/'))
}

/** Hat `dir` oder ein Vorfahr (bis zu 12 Ebenen) `tools/pr-einreichen.sh`? */
function hatEinreichSkript(dir) {
  let d = dir
  for (let n = 0; n < 12; n++) {
    if (fs.existsSync(path.join(d, 'tools', 'pr-einreichen.sh'))) return true
    const eltern = path.dirname(d)
    if (eltern === d) break
    d = eltern
  }
  return false
}

/** Gilt die Sperre für dieses `gh pr create`: bei --repo/-R nur für das eigene Repo, sonst wenn das Arbeitsverzeichnis das Skript hat. */
function sperrZiel(fund, dir) {
  return fund.repo ? fund.repo.toLowerCase() === EIGENES_REPO : hatEinreichSkript(dir)
}

/** `cwd` ist das Arbeitsverzeichnis der Hook-Eingabe; ohne Angabe gilt das Repo dieses Hooks. `cd` in Klammern wirkt nur darin. */
function pruefeBefehl(befehl, cwd = WURZEL) {
  let dir = cwd
  const aussen = []
  for (const seg of zerlege(ohneHeredoc(befehl))) {
    if (seg.auf) aussen.push(dir)
    else if (seg.zu) dir = aussen.pop() ?? dir
    else if (seg.tokens && pruefeSegment(seg.tokens, dir, (d) => { dir = d })) return true
  }
  return false
}

/** Ein Segment: `cd` setzt über `setzeDir` das Verzeichnis; true, wenn ein gesperrtes `gh pr create` darin steht. */
function pruefeSegment(tokens, dir, setzeDir) {
  for (let i = 0; i < tokens.length; i++) {
    const p = programmName(tokens[i])
    if (p === 'echo' || p === 'printf') return false
    if (p === 'cd') {
      setzeDir(nachCd(dir, tokens[i + 1]))
      return false
    }
    const skript = eingebetteterBefehl(tokens, i)
    if (skript) {
      if (pruefeBefehl(skript, dir)) return true
    } else if (p === 'gh' || p === 'gh.exe') {
      const fund = prCreate(tokens, i)
      if (fund && sperrZiel(fund, dir)) return true
    }
  }
  return false
}

/** Grund der Verweigerung (Text) oder null — Schnittstelle wie die Module des Verteilers. */
function pruefe(eingabe) {
  if (eingabe.tool_name !== 'Bash') return null
  if (!pruefeBefehl(String(eingabe.tool_input?.command ?? ''), eingabe.cwd || WURZEL)) return null
  return 'PR nur über bash tools/pr-einreichen.sh "<Titel>" ["<Text>"] einreichen — fährt die Vorprüfung (tools/pr-vorpruefung.mjs); rohes „gh pr create“ ist gesperrt.'
}

module.exports = { pruefe, pruefeBefehl }

if (require.main === module) {
  let roh = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => { roh += c })
  process.stdin.on('end', () => {
    try {
      const grund = pruefe(JSON.parse(roh))
      if (grund) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: grund } }))
    } catch (err) {
      process.stderr.write(`pr-create-sperre: ${err.message}\n`)
    }
    process.exit(0)
  })
}
