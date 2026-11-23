/**
 * `tools/daten-pr-mergen.sh` mit Attrappe für `gh`: Die App mergt am Ruleset vorbei, also nur eigene, nicht aus einem Fork stammende Pull Requests,
 * die ausschließlich Pfade der Quellenliste ändern (Prüfer-Urteil PR 767). Alles andere endet rot und ohne Merge.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const fehler = []
function pruefe(name, bedingung, gefunden) {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}
const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
/* Git Bash trennt PATH-Einträge an Doppelpunkten: „C:/x" muss dort „/c/x" heißen. */
const posix = (p) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, l) => `/${l.toLowerCase()}`)

const dir = mkdtempSync(join(tmpdir(), 'daten-pr-mergen-'))
try {
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  const gemergt = join(dir, 'gemergt.txt')
  const ausgabe = join(dir, 'ausgabe.txt')
  // Attrappe: Antworten kommen aus FALL (autor | fork | datei | ok); `pr merge` hält die Nummer fest.
  writeFileSync(
    join(bin, 'gh'),
    `#!/bin/sh
case "$1 $2" in
  "pr merge") echo "$3" >> "${posix(gemergt)}"; exit 0 ;;
esac
[ "$3" = 6 ] && [ -n "$FALL6" ] && FALL="$FALL6"
[ "$3" = 7 ] && [ -n "$FALL7" ] && FALL="$FALL7"
case "$7" in
  .state) case " $ERLEDIGT " in *" $3 "*) echo "$ZUSTAND" ;; *) echo OPEN ;; esac ;;
  .mergeable) case " $ERLEDIGT " in *" $3 "*) echo UNKNOWN; exit 0 ;; esac; if [ "$FALL" = konflikt ] || [ "$FALL" = autor-konflikt ]; then echo CONFLICTING; else echo MERGEABLE; fi ;;
  .title) if [ "$FALL" = rot ]; then echo "[Prüfung rot] chore(data): Test"; else echo "chore(data): Test"; fi ;;
  .author.login) if [ "$FALL" = autor ] || [ "$FALL" = autor-konflikt ]; then echo "app/fremder"; else echo "app/anime-kalender-daten"; fi ;;
  .isCrossRepository) if [ "$FALL" = fork ]; then echo true; else echo false; fi ;;
  .files*) echo data/crunchyroll.json; echo data/adn-raw/a.json; if [ "$FALL" = datei ]; then echo .github/workflows/x.yml; fi ;;
esac
`,
  )
  chmodSync(join(bin, 'gh'), 0o755)

  const lauf = (fall, nummern = ['7'], erledigt = '', zustand = 'MERGED', fall6 = '', fall7 = '') => {
    rmSync(gemergt, { force: true })
    rmSync(ausgabe, { force: true })
    const r = spawnSync('bash', ['tools/daten-pr-mergen.sh', ...nummern], {
      cwd: wurzel,
      encoding: 'utf8',
      env: { ...process.env, FALL: fall, ERLEDIGT: erledigt, ZUSTAND: zustand, FALL6: fall6, FALL7: fall7, GITHUB_OUTPUT: ausgabe, PATH: `${posix(bin)}:${process.env.PATH}` },
    })
    const liste = existsSync(gemergt) ? readFileSync(gemergt, 'utf8').trim().split('\n') : []
    return { status: r.status, out: `${r.stdout}${r.stderr}`, gemergt: liste.length > 0, liste, nachlauf: existsSync(ausgabe) ? readFileSync(ausgabe, 'utf8').trim() : '' }
  }

  const ok = lauf('ok')
  pruefe('eigener PR mit Pfaden der Quellenliste wird gemergt', ok.status === 0 && ok.gemergt, ok.out)
  for (const [fall, grund] of [['fork', /Fork/], ['datei', /workflows\/x\.yml/]]) {
    const r = lauf(fall)
    pruefe(`Fall „${fall}“: nicht gemergt, Lauf rot, PR-Nummer im Fehler`, r.status === 1 && !r.gemergt && /::error::Pull Request 7 wird nicht gemergt/.test(r.out) && grund.test(r.out), r.out)
  }
  const fremd = lauf('autor')
  pruefe('fremder Autor: nicht gemergt, Lauf bleibt grün, Warnung mit PR-Nummer und Autor', fremd.status === 0 && !fremd.gemergt && /::warning::Pull Request 7 übersprungen: Autor ist app\/fremder/.test(fremd.out), fremd.out)
  const fremdKonflikt = lauf('autor-konflikt')
  pruefe('fremder Autor mit Konflikt: ebenfalls nur Warnung, Lauf grün', fremdKonflikt.status === 0 && !fremdKonflikt.gemergt && /::warning::/.test(fremdKonflikt.out) && !/::error::/.test(fremdKonflikt.out), fremdKonflikt.out)
  const konflikt = lauf('konflikt')
  pruefe('Konflikt nach dem Auflösen: nicht gemergt, Lauf rot, PR-Nummer und Zustand im Fehler', konflikt.status === 1 && !konflikt.gemergt && /::error::Pull Request 7 bleibt offen \(CONFLICTING\)/.test(konflikt.out), konflikt.out)
  const rot = lauf('rot')
  pruefe('Marke „Prüfung rot“ im Titel: nicht gemergt, Lauf bleibt grün, Hinweis im Protokoll', rot.status === 0 && !rot.gemergt && /Pull Request 7 trägt die Marke/.test(rot.out), rot.out)
  for (const zustand of ['MERGED', 'CLOSED']) {
    const r = lauf('ok', ['6', '7'], '6', zustand)
    const hinweis = new RegExp(`::notice::Pull Request 6 übersprungen: schon ${zustand}`)
    pruefe(`PR (${zustand}) vor einem offenen: übersprungen, kein Rot, der offene wird gemergt`, r.status === 0 && r.liste.join() === '7' && hinweis.test(r.out) && !/::error::/.test(r.out), r)
  }
  const nurErledigt = lauf('ok', ['6'], '6')
  pruefe('nur ein gemergter PR: Lauf grün, nichts gemergt', nurErledigt.status === 0 && !nurErledigt.gemergt && !/::error::/.test(nurErledigt.out), nurErledigt.out)
  // PR 6 scheitert auf jede Art, PR 7 ist in Ordnung: die Schleife macht mit PR 7 weiter.
  for (const [fall6, rot6] of [['autor', 0], ['konflikt', 1], ['rot', 0], ['fork', 1]]) {
    const r = lauf('ok', ['6', '7'], '', 'MERGED', fall6)
    pruefe(`PR 6 im Fall „${fall6}“ vor einem guten PR 7: PR 7 wird gemergt, Ausgang ${rot6}`, r.status === rot6 && r.liste.join() === '7', r)
  }
  // Rennen um main (Lauf 45183026486): PR 6 wird gemergt, danach steht PR 7 im Konflikt — kein Rot, PR 7 geht in den Nachlauf.
  const rennen = lauf('ok', ['6', '7'], '', 'MERGED', '', 'konflikt')
  pruefe('PR 7 im Konflikt nach dem Merge von PR 6: Lauf grün, PR 6 gemergt, nachlauf=7', rennen.status === 0 && rennen.liste.join() === '6' && rennen.nachlauf === 'nachlauf=7' && !/::error::/.test(rennen.out), rennen)
  const ohneRennen = lauf('ok', ['6', '7'])
  pruefe('ohne Konflikt: beide gemergt, nachlauf leer', ohneRennen.status === 0 && ohneRennen.liste.join() === '6,7' && ohneRennen.nachlauf === 'nachlauf=', ohneRennen)
  const keinerGemergt = lauf('konflikt', ['6', '7'])
  pruefe('beide im Konflikt, nichts gemergt: weiter rot, kein Nachlauf (sonst Endlosschleife)', keinerGemergt.status === 1 && !keinerGemergt.gemergt && keinerGemergt.nachlauf === 'nachlauf=', keinerGemergt)
  // Verdrahtung: Das Skript schreibt `nachlauf`, beide Merge-Jobs reichen es aus Schritt `mergen` weiter, der Job `anstossen` läuft auch nach Rot (!cancelled()) und hat als einziger `actions: write`.
  const wf = parse(readFileSync(join(wurzel, '.github/workflows/claude-daten-merge.yml'), 'utf8'))
  for (const job of ['nachholen', 'zusammenfuehren']) {
    const schritt = wf.jobs[job].steps.find((s) => String(s.run ?? '').includes('daten-pr-mergen.sh'))
    pruefe(`Job ${job}: Merge-Schritt hat id mergen, Job-Ausgabe nachlauf zeigt darauf`, schritt?.id === 'mergen' && wf.jobs[job].outputs?.nachlauf === '${{ steps.mergen.outputs.nachlauf }}', wf.jobs[job].outputs)
  }
  const anst = wf.jobs.anstossen
  pruefe('Job anstossen: hängt an beiden Merge-Jobs, läuft trotz Rot, liest beide nachlauf', JSON.stringify(anst?.needs) === '["nachholen","zusammenfuehren"]' && /!cancelled\(\)/.test(anst.if) && /needs\.nachholen\.outputs\.nachlauf/.test(anst.if) && /needs\.zusammenfuehren\.outputs\.nachlauf/.test(anst.if), anst)
  pruefe('actions: write nur im Job anstossen, Workflow bei read', anst?.permissions?.actions === 'write' && wf.permissions.actions === 'read' && !wf.jobs.zusammenfuehren.permissions && !wf.jobs.nachholen.permissions, wf.permissions)
  const anstoss = anst?.steps?.[0]
  pruefe('Obergrenze: ab Durchgang 3 rot statt neuem Anstoß, Zähler läuft weiter', /-ge 3/.test(anstoss?.run) && /exit 1/.test(anstoss.run) && /durchgang=\$\(\(DURCHGANG \+ 1\)\)/.test(anstoss.run) && wf.on.workflow_dispatch.inputs.durchgang.default === '1', anstoss)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
if (fehler.length) {
  console.error(`\n${fehler.length} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('daten-pr-mergen.sh: alle Zusicherungen gehalten.')
