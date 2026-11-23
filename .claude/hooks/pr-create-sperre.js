// PreToolUse(Bash): `gh pr create` wird abgewiesen; ein PR geht nur über `bash tools/pr-einreichen.sh "<Titel>"`, das die Vorprüfung fährt.
// Anlass: Lehre 232 (23.11.2026): PR 4738 kam mit rohem `gh pr create`, die Kette war rot an der Patch-Notes-Pflicht; dasselbe schon 25.10.2026 (PR 2056).
// Der Hook sieht nur den äußeren Befehl: `bash tools/pr-einreichen.sh …` enthält den Text `gh pr create` nicht und bleibt frei,
// auch wenn das Skript ihn intern aufruft. Andere `gh pr`-Befehle (view, merge, comment, checks, edit) bleiben frei.
// Zerlegung wie in merge-riegel.js (Heredocs weg, Ketten, `bash -c`/`eval` rekursiv); `echo`/`printf`-Text zählt nicht.
// Bekannte Grenzen: Programm aus Variable (`$g pr create`), `gh`-Alias, PR über `gh api` oder GitHub-MCP.
const { zerlege, ohneHeredoc, eingebetteterBefehl, programmName } = require('./hauptordner-sperre.js')

/** `gh`-Optionen vor dem Unterbefehl, die einen Wert im nächsten Token nehmen. */
const GH_MIT_WERT = new Set(['-R', '--repo', '--hostname'])

/** Sind die Tokens ab dem `gh`-Token `von` ein `pr create`? */
function istPrCreate(tokens, von) {
  let i = von + 1
  for (; i < tokens.length; i++) {
    if (GH_MIT_WERT.has(tokens[i])) i++
    else if (!tokens[i].startsWith('-')) break
  }
  return tokens[i] === 'pr' && tokens[i + 1] === 'create'
}

function pruefeBefehl(befehl) {
  for (const { tokens } of zerlege(ohneHeredoc(befehl))) {
    if (!tokens) continue
    for (let i = 0; i < tokens.length; i++) {
      const p = programmName(tokens[i])
      if (p === 'echo' || p === 'printf') break
      const skript = eingebetteterBefehl(tokens, i)
      if (skript) {
        if (pruefeBefehl(skript)) return true
      } else if ((p === 'gh' || p === 'gh.exe') && istPrCreate(tokens, i)) return true
    }
  }
  return false
}

/** Grund der Verweigerung (Text) oder null — Schnittstelle wie die Module des Verteilers. */
function pruefe(eingabe) {
  if (eingabe.tool_name !== 'Bash') return null
  if (!pruefeBefehl(String(eingabe.tool_input?.command ?? ''))) return null
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
