// PreToolUse(Bash): `gh pr create` wird abgewiesen; ein PR geht nur über `bash tools/pr-einreichen.sh "<Titel>"`, das die Vorprüfung fährt.
// Anlass: Lehre 232 (23.11.2026): PR 4738 kam mit rohem `gh pr create`, die Kette war rot an der Patch-Notes-Pflicht; dasselbe schon 25.10.2026 (PR 2056).
// Der Hook sieht nur den äußeren Befehl: `bash tools/pr-einreichen.sh …` enthält den Text `gh pr create` nicht und bleibt frei,
// auch wenn das Skript ihn intern aufruft. Andere `gh pr`-Befehle (view, merge, comment, checks, edit) bleiben frei.
// Zerlegung wie in merge-riegel.js (Heredocs weg, Ketten, `bash -c`/`eval` rekursiv); `echo`/`printf`-Text zählt nicht.
// Nur für dieses Repo (Anlass: chrome-utilities hat kein `tools/pr-einreichen.sh`, 23.11.2026). Ziel-Repo in dieser Reihenfolge:
// `--repo`/`-R`/`--repo=`/`-Rowner/name` an beliebiger Stelle der gh-Zeile (auch nach `create`), `GH_REPO=` (auch `env`/`export`), sonst das Verzeichnis
// (`cwd` der Eingabe, `cd`/`pushd` davor): `tools/pr-einreichen.sh` im Ordner oder einem Vorfahr, sonst `git remote get-url origin`.
// Nicht bestimmbares Ziel (`$X`, `~`, `cd -`, `popd`, fehlender Ordner, Repo-Wert mit `$`) sperrt: im Zweifel Sperre (Prüfer R1, PR 4770).
// Bekannte Grenzen: Programm aus Variable (`$g pr create`), `gh`-Alias, PR über `gh api` oder GitHub-MCP.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { zerlege, ohneHeredoc, eingebetteterBefehl, programmName } = require('./hauptordner-sperre.js')

const EIGENES_REPO = 'dernamenlosedaniel/anime-kalender-de'
const WURZEL = path.resolve(__dirname, '..', '..')
const GH_REPO_NAME = /^(?:GH_REPO)=(.*)$/s

/** `owner/name` (klein) aus `owner/name`, `HOST/owner/name`, `https://host/owner/name(.git)`, `git@host:owner/name.git`; null, wenn nicht lesbar. */
function normRepo(roh) {
  if (!roh || /[$`]/.test(roh)) return null
  const s = String(roh).trim().replace(/^[a-z+]+:\/\//i, '').replace(/^[^@/]*@/, '').replace(/:/g, '/')
  const teile = s.split('/').filter(Boolean)
  if (teile.length < 2) return null
  const name = teile.at(-1).replace(/\.git$/i, '')
  return `${teile.at(-2)}/${name}`.toLowerCase()
}

/** Ziel-Repo aus den Tokens ab `von` (Optionen vor und nach `pr create`): { gefunden, wert }. */
function repoOption(tokens, von) {
  for (let i = von; i < tokens.length; i++) {
    const t = tokens[i]
    if (t === '-R' || t === '--repo') return { gefunden: true, wert: tokens[i + 1] }
    if (t.startsWith('--repo=')) return { gefunden: true, wert: t.slice('--repo='.length) }
    if (/^-R.+/.test(t) && !t.startsWith('--')) return { gefunden: true, wert: t.slice(2) }
  }
  return { gefunden: false }
}

/** `GH_REPO=`-Wert aus den Tokens vor dem Programm (auch hinter `env`/`export`); null, wenn keiner. */
function envRepo(tokens, bis) {
  for (let i = 0; i < bis; i++) {
    const m = GH_REPO_NAME.exec(tokens[i])
    if (m) return m[1]
  }
  return null
}

/** `gh pr create` ab dem `gh`-Token `von`: true, wenn es eins ist (Optionen vor `pr` überspringen). */
function istPrCreate(tokens, von) {
  let i = von + 1
  for (; i < tokens.length; i++) {
    if (['-R', '--repo', '--hostname'].includes(tokens[i])) i++
    else if (!tokens[i].startsWith('-')) break
  }
  return tokens[i] === 'pr' && tokens[i + 1] === 'create'
}

/** Verzeichnis nach `cd`/`pushd` (Optionen wie `-P` übersprungen); null = nicht bestimmbar (`$X`, `~`, `-`, kein Ziel, relativ zu unbekannt). */
function nachCd(von, tokens, i) {
  let j = i + 1
  while (tokens[j] && tokens[j].startsWith('-') && tokens[j] !== '-') j++
  if (tokens[j] === '--') j++
  const ziel = tokens[j]
  if (!ziel || ziel === '-' || /[$`~*?]/.test(ziel)) return null
  const abs = ziel.replace(/^\/([a-zA-Z])\//, '$1:/')
  if (von == null && !path.isAbsolute(abs)) return null
  return path.resolve(von ?? '', abs)
}

/** `git remote get-url origin` im Ordner als owner/name oder null. */
function remoteRepo(dir) {
  try {
    return normRepo(execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch {
    return null
  }
}

/** Hat `dir` oder ein Vorfahr `tools/pr-einreichen.sh`? */
function hatEinreichSkript(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'tools', 'pr-einreichen.sh'))) return true
    if (path.dirname(d) === d) return false
  }
}

/** Gilt die Sperre für das Verzeichnis `dir` (null = unbekannt: sperren)? */
function sperrtVerzeichnis(dir) {
  if (dir == null || !fs.existsSync(dir)) return true
  return hatEinreichSkript(dir) || remoteRepo(dir) === EIGENES_REPO
}

/** Gilt die Sperre für dieses `gh pr create`? `z`: { dir, gh } (Arbeitsverzeichnis, GH_REPO aus früherem Segment). */
function sperrZiel(tokens, i, z) {
  const opt = repoOption(tokens, i + 1)
  const repo = opt.gefunden ? opt.wert : (envRepo(tokens, i) ?? z.gh)
  if (repo != null) return normRepo(repo) === null || normRepo(repo) === EIGENES_REPO
  return sperrtVerzeichnis(z.dir)
}

/** Reine Zuweisungen (`NAME=…`, auch nach `export`): merkt `GH_REPO` in `z`; true, wenn das Segment nur daraus bestand. */
function zuweisung(tokens, z) {
  const rest = tokens[0] === 'export' ? tokens.slice(1) : tokens
  if (!rest.length || !rest.every((t) => /^[A-Za-z_]\w*=/.test(t))) return false
  const g = rest.map((t) => GH_REPO_NAME.exec(t)).find(Boolean)
  if (g) z.gh = g[1]
  return true
}

/** Ein Segment: `cd`/`pushd` setzen `z.dir`; true, wenn ein gesperrtes `gh pr create` darin steht. */
function pruefeSegment(tokens, z) {
  if (zuweisung(tokens, z)) return false
  for (let i = 0; i < tokens.length; i++) {
    const p = programmName(tokens[i])
    if (p === 'echo' || p === 'printf') return false
    if (p === 'cd' || p === 'pushd') {
      z.dir = nachCd(z.dir, tokens, i)
      return false
    }
    if (p === 'popd') {
      z.dir = null
      return false
    }
    const skript = eingebetteterBefehl(tokens, i)
    if (skript) {
      if (pruefeBefehl(skript, z.dir, z.gh)) return true
    } else if ((p === 'gh' || p === 'gh.exe') && istPrCreate(tokens, i) && sperrZiel(tokens, i, z)) return true
  }
  return false
}

/** `cwd` ist das Arbeitsverzeichnis der Hook-Eingabe (null = unbekannt); `cd` in Klammern wirkt nur darin. */
function pruefeBefehl(befehl, cwd = WURZEL, gh = null) {
  const z = { dir: cwd, gh }
  const aussen = []
  for (const seg of zerlege(ohneHeredoc(befehl))) {
    if (seg.auf) aussen.push({ ...z })
    else if (seg.zu) Object.assign(z, aussen.pop() ?? z)
    else if (seg.tokens && pruefeSegment(seg.tokens, z)) return true
  }
  return false
}

/** Grund der Verweigerung (Text) oder null — Schnittstelle wie die Module des Verteilers. */
function pruefe(eingabe) {
  if (eingabe.tool_name !== 'Bash') return null
  if (!pruefeBefehl(String(eingabe.tool_input?.command ?? ''), eingabe.cwd || WURZEL)) return null
  return 'PR nur über bash tools/pr-einreichen.sh "<Titel>" ["<Text>"] einreichen — fährt die Vorprüfung (tools/pr-vorpruefung.mjs); rohes „gh pr create“ ist gesperrt.'
}

module.exports = { pruefe, pruefeBefehl, normRepo }

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
