// PreToolUse(Bash): vor `git push` prüft `node tools/mutationsanker.mjs --diff`, ob die Mutationsanker (tools/mutationen/*.json)
// der Listen des Diffs und aller Listen mit Ziel im Diff noch gefunden werden; toter Anker → deny mit Datei, Mutant, was fehlt.
// Anlass: Lehre 227 (PR 4694, 4659, 4718): Bauer änderte Code, ohne die Anker nachzuziehen; es fiel erst in der PR-Prüfkette auf.
// Kostet ~0,1 s. Ein Fehler des Wächters selbst (kein Skript, Absturz, Zeitüberschreitung) sperrt nicht: die Kette bleibt das Netz.
// Zerlegung wie in no-verify-sperre.js; `-C <pfad>` bestimmt das Arbeitsverzeichnis, sonst `cwd` der Eingabe.
const { spawnSync } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')
const { zerlege, ohneHeredoc, eingebetteterBefehl, programmName } = require('./hauptordner-sperre.js')

/** Globale Git-Optionen mit eigenem Wert im nächsten Token. */
const MIT_WERT = new Set(['-C', '-c', '--config-env', '--git-dir', '--work-tree', '--namespace', '--exec-path'])

/** Löschender Push (`--delete`/`-d`, Refspec `:zweig`): prüft nichts am HEAD, wird nicht gesperrt. Sonst gilt immer der HEAD des Orts, auch bei `git push origin <anderer Zweig>`. */
const loeschtZweig = (args) => args.some((a) => a === '--delete' || a === '-d' || a.startsWith(':'))

/** Ort des Pushs: `-C` relativ zum letzten `cd` (`cd <wt> && git push` ist die Standardform der Agenten). */
const ortVon = (cd, c) => (cd && c && !path.isAbsolute(c) ? path.join(cd, c) : c || cd)

/** Arbeitsverzeichnisse ('' = Standard) aller `git push` des Befehls; ein `cd` gilt bis zum Ende seiner Klammer. */
function pushOrte(befehl, cd = '') {
  const orte = []
  const stapel = []
  for (const seg of zerlege(ohneHeredoc(befehl))) {
    if (seg.auf) stapel.push(cd)
    else if (seg.zu) cd = stapel.pop() ?? cd
    const tokens = seg.tokens
    if (!tokens) continue
    if (tokens[0] === 'cd' && tokens[1]) {
      cd = ortVon(cd, tokens[1])
      continue
    }
    for (let i = 0; i < tokens.length; i++) {
      const p = programmName(tokens[i])
      if (p === 'echo' || p === 'printf') break
      const skript = eingebetteterBefehl(tokens, i)
      if (skript) orte.push(...pushOrte(skript, cd))
      else if (p === 'git' || p === 'git.exe') {
        let ort = ''
        let k = i + 1
        for (; k < tokens.length; k++) {
          if (tokens[k] === '-C') ort = tokens[k + 1] ?? ''
          if (MIT_WERT.has(tokens[k])) k++
          else if (!tokens[k].startsWith('-')) break
        }
        if (tokens[k] === 'push' && !loeschtZweig(tokens.slice(k + 1))) orte.push(ortVon(cd, ort))
      }
    }
  }
  return orte
}

/** Meldung mit den toten Ankern für ein Verzeichnis oder null (grün, Wächter nicht vorhanden oder selbst gestört). */
function pruefeOrt(ort) {
  const skript = path.join(ort, 'tools', 'mutationsanker.mjs')
  if (!existsSync(skript)) return null
  const r = spawnSync(process.execPath, [skript, '--diff'], { cwd: ort, encoding: 'utf8', timeout: 20000, windowsHide: true })
  if (r.status !== 1) {
    if (r.status !== 0) process.stderr.write(`anker-wache: Lauf in ${ort} endete mit ${r.status ?? r.error?.message}\n`)
    return null
  }
  return r.stderr.trim()
}

/** Grund der Verweigerung (Text) oder null — Schnittstelle wie die Module des Verteilers. */
function pruefe(eingabe) {
  if (eingabe.tool_name !== 'Bash') return null
  const orte = [...new Set(pushOrte(String(eingabe.tool_input?.command ?? '')).map((o) => path.resolve(eingabe.cwd ?? process.cwd(), o)))]
  for (const ort of orte) {
    const rot = pruefeOrt(ort)
    if (rot) return `git push gesperrt: Mutationsanker tot (Lehre 227). Anker in tools/mutationen/*.json im selben Commit nachziehen, dann erneut pushen.\n${rot}`
  }
  return null
}

module.exports = { pruefe, pushOrte }
