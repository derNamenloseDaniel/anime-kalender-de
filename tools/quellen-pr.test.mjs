/**
 * `tools/quellen-pr.sh` gegen einen lokalen Ursprung mit Attrappe für `gh`: Der Pull-Request-Zweig entsteht aus den eigenen Änderungen auf dem jüngsten Stand, und eine
 * abgelehnte erste Übertragung (GitHub verweigert Zweige mit abweichenden Workflow-Dateien) wird neu aufgesetzt statt als Verlust des Laufs zu enden.
 * Anlass (05.10.2026): Der Wochenlauf verlor am Ende 107 Minuten Abrufe, weil ein Workflow auf main geändert worden war.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { ohneCiToken } from './bau-umgebung.mjs'

const fehler = []
function pruefe(name, bedingung, gefunden) {
  if (bedingung) return console.log(`  ✓ ${name}`)
  fehler.push(name)
  console.error(`  ✗ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
const sh = (cwd, befehl, env = {}) => {
  const r = spawnSync('bash', ['-c', befehl], { cwd, encoding: 'utf8', env: { ...ohneCiToken(), ...env } })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}
const git = 'git -c user.name=t -c user.email=t@t'
/* Git Bash trennt PATH-Einträge an Doppelpunkten: „C:/x" muss dort „/c/x" heißen. */
const posix = (p) => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, l) => `/${l.toLowerCase()}`)

const dir = mkdtempSync(join(tmpdir(), 'quellen-pr-'))
try {
  const ursprung = join(dir, 'ursprung.git')
  const lauf = join(dir, 'lauf')
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  sh(dir, 'git init -q --bare -b main ursprung.git && git clone -q ursprung.git lauf 2>/dev/null')

  // Der Ursprung lehnt die erste Übertragung eines Zweigs ab (Attrappe für „refusing to allow a GitHub App to create or update workflow …").
  mkdirSync(join(ursprung, 'hooks'), { recursive: true })
  writeFileSync(join(ursprung, 'hooks/pre-receive'), '#!/bin/sh\nif [ -f "$GIT_DIR/ablehnen" ]; then rm "$GIT_DIR/ablehnen"; echo "abgelehnt (Attrappe)" >&2; exit 1; fi\nexit 0\n')
  chmodSync(join(ursprung, 'hooks/pre-receive'), 0o755)

  // Attrappe für gh: legt nichts an, antwortet MERGEABLE, merge gelingt nur mit --admin (Bypass der App im Ruleset).
  writeFileSync(
    join(bin, 'gh'),
    `#!/bin/sh
case "$1 $2" in
  "pr create") echo "https://github.com/x/y/pull/99" ;;
  "pr view") echo "MERGEABLE" ;;
  "pr merge") case "$*" in *--admin*) ;; *) echo "To use administrator privileges to immediately merge the pull request, add the --admin flag." >&2; exit 1 ;; esac
    if [ ! -f "$(dirname "$0")/schon-einmal" ]; then : > "$(dirname "$0")/schon-einmal"; echo "GraphQL: Base branch was modified." >&2; exit 1; fi; exit 0 ;;
esac
`,
  )
  chmodSync(join(bin, 'gh'), 0o755)

  mkdirSync(join(lauf, 'data'), { recursive: true })
  mkdirSync(join(lauf, 'tools'), { recursive: true })
  for (const datei of ['quellen-liste.sh', 'quellen-aufsetzen.sh', 'quellen-pr.sh', 'quellen-pruefen.sh', 'quellen-bauprobe.sh', 'health-vereinen.mjs', 'dub-belege-vereinen.mjs'])
    copyFileSync(join(wurzel, 'tools', datei), join(lauf, 'tools', datei))
  writeFileSync(join(lauf, 'data/anisearch.json'), '{"v":1}')
  sh(lauf, `git add -A && ${git} commit -q -m start && git push -q origin HEAD:main`)

  // Der Lauf ändert eine Quelle, eine zweite Person (der Fernstand) bewegt main in der Zwischenzeit.
  writeFileSync(join(lauf, 'data/anisearch.json'), '{"v":2}')
  writeFileSync(join(lauf, 'data/cinestar.json'), '{"neu":true}')
  const anderer = join(dir, 'anderer')
  sh(dir, 'git clone -q ursprung.git anderer 2>/dev/null')
  writeFileSync(join(anderer, 'README.md'), 'fremd')
  sh(anderer, `git add -A && ${git} commit -q -m fremd && git push -q origin HEAD:main`)

  writeFileSync(join(ursprung, 'ablehnen'), '')
  const ausgabeDatei = join(dir, 'ausgabe.txt')
  writeFileSync(ausgabeDatei, '')
  const r = sh(lauf, `PATH="${posix(bin)}:$PATH" GITHUB_OUTPUT="${posix(ausgabeDatei)}" GITHUB_RUN_ID=77 QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): Test"`, {})
  const knapp = r.out.split('\n').filter((z) => !z.includes('übersprungen (nicht vorhanden)')).join('\n').slice(-1800)
  pruefe('das Skript endet mit Erfolg', r.status === 0, `${r.status} ${knapp}`)
  pruefe('die abgelehnte erste Übertragung wird gemeldet und neu aufgesetzt', /Push abgelehnt \(Versuch 1 von 3\)/.test(r.out), r.out.slice(-400))
  pruefe('ein Merge, der an „Base branch was modified" scheitert, wird wiederholt', /Merge-Versuch 1 von 6 abgelehnt/.test(r.out), r.out.slice(-400))
  const ausgabe = readFileSync(ausgabeDatei, 'utf8')
  pruefe('der Pull Request ist angelegt und gemergt', /pr=99/.test(ausgabe) && /gemerged=true/.test(ausgabe), ausgabe)
  const zweige = sh(ursprung, 'git branch --list "daten/*"').out.trim()
  pruefe('der Zweig steht im Ursprung', /daten\/77-/.test(zweige), zweige)
  const zweig = zweige.replace(/^\*?\s*/, '').split('\n')[0]
  const inhalt = sh(ursprung, `git show ${zweig}:data/anisearch.json`).out.trim()
  const dateien = sh(ursprung, `git diff --name-only main ${zweig}`).out.trim().split('\n').sort()
  pruefe('der Zweig trägt die eigene Änderung', inhalt === '{"v":2}', inhalt)
  pruefe('der Zweig liegt auf dem jüngsten main: nur die eigenen Dateien unterscheiden ihn', dateien.join(',') === 'data/anisearch.json,data/cinestar.json', dateien)

  // Anmeldung der Claude-Läufe: Token in der Remote-Adresse; insteadOf (nur in der Umgebung, nicht in .git/config) lenkt sie auf den lokalen Ursprung.
  const mitToken = 'https://x-access-token:geheim@github.com/x/y.git'
  sh(lauf, `git remote set-url origin "${mitToken}"`)
  pruefe('Vorbedingung: das Token steht in .git/config', readFileSync(join(lauf, '.git/config'), 'utf8').includes('geheim'))
  const umlenken = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `url.${posix(ursprung)}.insteadOf`, GIT_CONFIG_VALUE_0: mitToken }
  const r2 = sh(lauf, `PATH="${posix(bin)}:$PATH" GITHUB_RUN_ID=78 QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): Test 2"`, umlenken)
  pruefe('zweiter Lauf über die Token-Adresse endet mit Erfolg', r2.status === 0, r2.out.slice(-600))
  const remote = sh(lauf, 'git config --get remote.origin.url').out.trim()
  pruefe('nach dem Lauf steht das Token nicht mehr in .git/config', !readFileSync(join(lauf, '.git/config'), 'utf8').includes('geheim') && remote === 'https://github.com/x/y.git', remote)

  // Sammler-Lauf (07.11.2026): Remote ohne Token, Checkout-Anmeldung als extraheader. Das Skript meldet sich mit dem App-Token an (nur die App darf Workflow-Dateien pushen);
  // insteadOf lenkt nur die Adresse MIT App-Token auf den lokalen Ursprung, ohne Anmeldung scheitert schon das Holen.
  const appAdresse = 'https://x-access-token:appgeheim@github.com/x/y.git'
  sh(lauf, 'git remote set-url origin https://github.com/x/y.git && git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic checkoutgeheim"')
  writeFileSync(join(lauf, 'data/cinestar.json'), '{"neu":"app"}')
  const mitApp = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `url.${posix(ursprung)}.insteadOf`, GIT_CONFIG_VALUE_0: appAdresse, GIT_TERMINAL_PROMPT: '0' }
  const r4 = sh(lauf, `PATH="${posix(bin)}:$PATH" GITHUB_ACTIONS=true GH_TOKEN=appgeheim GITHUB_REPOSITORY=x/y GITHUB_RUN_ID=80 QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): Test App"`, mitApp)
  pruefe('Lauf in Actions: Zweig-Push mit dem App-Token endet mit Erfolg', r4.status === 0, r4.out.slice(-600))
  pruefe('der Zweig des Laufs mit App-Token steht im Ursprung', /daten\/80-/.test(sh(ursprung, 'git branch --list "daten/80-*"').out))
  const konfig = readFileSync(join(lauf, '.git/config'), 'utf8')
  pruefe('danach stehen weder App-Token noch Checkout-Anmeldung in .git/config', !konfig.includes('appgeheim') && !konfig.includes('checkoutgeheim'), konfig)

  // Lokaler Aufruf ohne Lauf-Kennung (Daniels Rechner): kein `daten/`-Zweig, den Kette und CI-Prüfer überspringen.
  sh(lauf, `git remote set-url origin "${posix(ursprung)}"`)
  writeFileSync(join(lauf, 'data/cinestar.json'), '{"neu":"lokal"}')
  const r3 = sh(lauf, `env -u GITHUB_RUN_ID PATH="${posix(bin)}:$PATH" QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): Test 3"`, {})
  pruefe('lokaler Aufruf endet mit Erfolg', r3.status === 0, r3.out.slice(-600))
  const lokal = sh(ursprung, 'git branch --list "fix/lokal-*"').out.trim()
  pruefe('lokaler Aufruf legt einen Zweig fix/lokal-… an', /fix\/lokal-\d{8}-\d{4}/.test(lokal), lokal)
  const daten = sh(ursprung, 'git branch --list "daten/*"').out
  pruefe('lokaler Aufruf legt keinen daten/-Zweig an', !/daten\/lokal/.test(daten), daten)

  // Zwei Jobs desselben Laufs in derselben Minute (Wochenlauf 03.11.2026): eigener Zweig je Job, der zweite überschreibt den ersten nicht.
  const uhr = join(dir, 'uhr')
  mkdirSync(uhr)
  writeFileSync(join(uhr, 'date'), '#!/bin/sh\necho 20261103-0658\n')
  chmodSync(join(uhr, 'date'), 0o755)
  for (const [job, inhaltJob] of [['anilist', '{"job":"a"}'], ['tmdb', '{"job":"t"}']]) {
    writeFileSync(join(lauf, 'data/cinestar.json'), inhaltJob)
    const rj = sh(lauf, `PATH="${posix(uhr)}:${posix(bin)}:$PATH" GITHUB_RUN_ID=79 GITHUB_JOB=${job} QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): ${job}"`, {})
    pruefe(`Job ${job} endet mit Erfolg`, rj.status === 0, rj.out.slice(-400))
  }
  const jobZweige = sh(ursprung, 'git branch --list "daten/79-*"').out.split('\n').map((z) => z.trim()).filter(Boolean)
  pruefe('zwei Jobs in derselben Minute: zwei Zweige', jobZweige.join(',') === 'daten/79-anilist-20261103-0658,daten/79-tmdb-20261103-0658', jobZweige)
  const ersterInhalt = sh(ursprung, 'git show daten/79-anilist-20261103-0658:data/cinestar.json').out.trim()
  pruefe('der Zweig des ersten Jobs trägt weiter dessen Fund', ersterInhalt === '{"job":"a"}', ersterInhalt)

  // `gh pr create` scheitert (GitHub-502 ohne Antwort, Sendezeiten-Lauf 05.11.2026): drei Versuche, vorher Blick auf einen schon bestehenden PR, Fehlertext im Log.
  const bin2 = join(dir, 'bin2')
  mkdirSync(bin2)
  writeFileSync(join(bin2, 'sleep'), '#!/bin/sh\nexit 0\n')
  writeFileSync(
    join(bin2, 'gh'),
    `#!/bin/sh
D="$(dirname "$0")"
case "$1 $2" in
  "pr create") echo x >> "$D/create-aufrufe"
    if [ "$(wc -l < "$D/create-aufrufe")" -le "$(cat "$D/create-fehler")" ]; then echo "HTTP 502: Bad Gateway (Versuch $(wc -l < "$D/create-aufrufe"))" >&2; exit 1; fi
    echo "https://github.com/x/y/pull/99" ;;
  "pr list") [ -f "$D/schon-da" ] && echo "https://github.com/x/y/pull/88"
    if [ -f "$D/da-ab" ] && [ "$(wc -l < "$D/create-aufrufe")" -ge "$(cat "$D/da-ab")" ]; then echo "https://github.com/x/y/pull/77"; fi
    exit 0 ;;
  "pr view") case "$*" in *state*) [ -f "$D/view-fehler" ] && exit 1; echo OPEN ;; *) echo MERGEABLE ;; esac ;;
  "pr merge") echo x >> "$D/merge-aufrufe"
    if [ -f "$D/merge-fehler" ] && [ "$(wc -l < "$D/merge-aufrufe")" -le "$(cat "$D/merge-fehler")" ]; then echo "HTTP 502: Bad Gateway (Merge $(wc -l < "$D/merge-aufrufe"))" >&2; exit 1; fi
    exit 0 ;;
esac
`,
  )
  chmodSync(join(bin2, 'gh'), 0o755)
  chmodSync(join(bin2, 'sleep'), 0o755)
  const anlegen = (nr, fehlerAnzahl, schonDa = false, daAb = 0, mergeFehler = 0) => {
    writeFileSync(join(bin2, 'create-fehler'), String(fehlerAnzahl))
    writeFileSync(join(bin2, 'create-aufrufe'), '')
    writeFileSync(join(bin2, 'merge-aufrufe'), '')
    rmSync(join(bin2, 'schon-da'), { force: true })
    rmSync(join(bin2, 'da-ab'), { force: true })
    rmSync(join(bin2, 'merge-fehler'), { force: true })
    if (daAb) writeFileSync(join(bin2, 'da-ab'), String(daAb))
    if (mergeFehler) writeFileSync(join(bin2, 'merge-fehler'), String(mergeFehler))
    if (schonDa) writeFileSync(join(bin2, 'schon-da'), '')
    writeFileSync(join(lauf, 'data/cinestar.json'), `{"anlegen":${nr}}`)
    const aus = join(dir, `ausgabe-${nr}.txt`)
    writeFileSync(aus, '')
    const res = sh(lauf, `PATH="${posix(bin2)}:$PATH" GITHUB_OUTPUT="${posix(aus)}" GITHUB_RUN_ID=8${nr} QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "chore(data): anlegen ${nr}"`, {})
    return { ...res, merges: readFileSync(join(bin2, 'merge-aufrufe'), 'utf8').split('\n').filter(Boolean).length, aufrufe: readFileSync(join(bin2, 'create-aufrufe'), 'utf8').split('\n').filter(Boolean).length, ausgabe: readFileSync(aus, 'utf8') }
  }
  const zweimal = anlegen(1, 2)
  pruefe('PR-Anlegen: zwei Fehlversuche, der dritte gelingt', zweimal.status === 0 && zweimal.aufrufe === 3 && /pr=99/.test(zweimal.ausgabe), `${zweimal.status} ${zweimal.aufrufe} ${zweimal.out.slice(-300)}`)
  pruefe('PR-Anlegen: der Fehlertext jedes Versuchs steht im Log', /Versuch 1 von 3\): HTTP 502: Bad Gateway \(Versuch 1\)/.test(zweimal.out) && /Versuch 2 von 3\): HTTP 502: Bad Gateway \(Versuch 2\)/.test(zweimal.out), zweimal.out.slice(-400))
  const schonDa = anlegen(2, 1, true)
  pruefe('PR-Anlegen: ein trotz Fehler entstandener PR wird übernommen, kein zweites create', schonDa.status === 0 && schonDa.aufrufe === 1 && /pr=88/.test(schonDa.ausgabe), `${schonDa.status} ${schonDa.aufrufe} ${schonDa.ausgabe}`)
  const dreimal = anlegen(3, 3)
  pruefe('PR-Anlegen: drei Fehlversuche enden rot mit ::error:: und letztem Text', dreimal.status !== 0 && dreimal.aufrufe === 3 && /::error::.*nach drei Versuchen.*Bad Gateway \(Versuch 3\)/.test(dreimal.out), `${dreimal.status} ${dreimal.aufrufe} ${dreimal.out.slice(-300)}`)
  // 502 beim dritten create, der PR entstand trotzdem (Läufe 45650281762 und 45650286140, 25.11.2026): übernehmen statt ::error::.
  const letzter = anlegen(4, 3, false, 3)
  pruefe('PR-Anlegen: nach dem dritten Fehlversuch wird ein entstandener PR übernommen und gemergt', letzter.status === 0 && letzter.aufrufe === 3 && /pr=77/.test(letzter.ausgabe) && /gemerged=true/.test(letzter.ausgabe) && !/::error::/.test(letzter.out), `${letzter.status} ${letzter.aufrufe} ${letzter.ausgabe} ${letzter.out.slice(-300)}`)
  // 502 beim Merge: der echte Grund steht im Log, nicht „main hat sich bewegt“ (auch im Rot-Zweig nach erschöpften Pausen).
  const mergeEinmal = anlegen(5, 0, false, 0, 1)
  pruefe('Merge: ein 502 wird mit seinem Text gemeldet, nicht als „main hat sich bewegt“', mergeEinmal.status === 0 && mergeEinmal.merges === 2 && /Serverfehler \(HTTP 502: Bad Gateway \(Merge 1\)\)/.test(mergeEinmal.out) && !/main hat sich bewegt/.test(mergeEinmal.out) && /gemerged=true/.test(mergeEinmal.ausgabe), `${mergeEinmal.status} ${mergeEinmal.merges} ${mergeEinmal.out.slice(-400)}`)
  const mergeImmer = anlegen(6, 0, false, 0, 99)
  pruefe('Merge: dauerhaft 502 endet rot nach fünf Versuchen, der echte Grund steht im ::error::', mergeImmer.status !== 0 && mergeImmer.merges === 5 && /::error::.*zuletzt: HTTP 502: Bad Gateway \(Merge 5\)/.test(mergeImmer.out) && /gemerged=false/.test(mergeImmer.ausgabe) && /pr=99/.test(mergeImmer.ausgabe), `${mergeImmer.status} ${mergeImmer.merges} ${mergeImmer.out.slice(-400)}`)
  // Die Zustandsabfrage vor dem nächsten Versuch scheitert selbst (leere Antwort): kein gemerged=true aus dem Nichts, es wird weiter versucht.
  writeFileSync(join(bin2, 'view-fehler'), '')
  const abfrageWeg = anlegen(7, 0, false, 0, 99)
  pruefe('Merge: scheiternde Zustandsabfrage gilt nicht als gemergt, alle fünf Versuche laufen, rot', abfrageWeg.status !== 0 && abfrageWeg.merges === 5 && /gemerged=false/.test(abfrageWeg.ausgabe) && !/gemerged=true/.test(abfrageWeg.ausgabe), `${abfrageWeg.status} ${abfrageWeg.merges} ${abfrageWeg.out.slice(-300)}`)
  rmSync(join(bin2, 'view-fehler'), { force: true })

  // `gh pr merge` scheitert mit GitHub-5xx (Lauf 45650281762, 25.11.2026: über 2 Minuten 502/„Something went wrong"): wachsende Pausen, vor jedem neuen Versuch Zustand lesen;
  // „Base branch was modified" bleibt bei kurzen Pausen und sechs Versuchen.
  const bin3 = join(dir, 'bin3')
  mkdirSync(bin3)
  writeFileSync(join(bin3, 'sleep'), '#!/bin/sh\necho "$1" >> "$(dirname "$0")/pausen"\n')
  writeFileSync(
    join(bin3, 'gh'),
    `#!/bin/sh
D="$(dirname "$0")"
case "$1 $2" in
  "pr create") for a in "$@"; do printf '%s\\n' "$a"; done > "$D/create-args"; echo "https://github.com/x/y/pull/99" ;;
  "pr list") exit 0 ;;
  "pr view") case "$*" in *state*) [ -f "$D/gemergt" ] && echo MERGED || echo OPEN ;; *) echo MERGEABLE ;; esac ;;
  "pr merge") echo x >> "$D/merge-aufrufe"
    if [ "$(wc -l < "$D/merge-aufrufe")" -le "$(cat "$D/merge-fehler")" ]; then cat "$D/merge-meldung" >&2; exit 1; fi
    exit 0 ;;
esac
`,
  )
  chmodSync(join(bin3, 'gh'), 0o755)
  chmodSync(join(bin3, 'sleep'), 0o755)
  const mergen = (nr, { fehler, meldung, gemergt = false, nachricht = `chore(data): mergen ${nr}`, faktor = '' }) => {
    for (const d of ['merge-aufrufe', 'pausen', 'gemergt', 'create-args']) rmSync(join(bin3, d), { force: true })
    writeFileSync(join(bin3, 'merge-aufrufe'), '')
    writeFileSync(join(bin3, 'merge-fehler'), String(fehler))
    writeFileSync(join(bin3, 'merge-meldung'), meldung)
    if (gemergt) writeFileSync(join(bin3, 'gemergt'), '')
    writeFileSync(join(lauf, 'data/cinestar.json'), `{"mergen":${nr}}`)
    const aus = join(dir, `ausgabe-m${nr}.txt`)
    writeFileSync(aus, '')
    const res = sh(lauf, `PATH="${posix(bin3)}:$PATH" ${faktor} GITHUB_OUTPUT="${posix(aus)}" GITHUB_RUN_ID=9${nr} QUELLEN_PRUEFBEFEHL=true bash tools/quellen-pr.sh "$NACHRICHT"`, { NACHRICHT: nachricht })
    const lies = (d) => (readFileSync(join(bin3, d), 'utf8').split('\n').filter(Boolean))
    return { ...res, aufrufe: lies('merge-aufrufe').length, pausen: lies('pausen').filter((p) => Number(p) >= 3).join(','), ausgabe: readFileSync(aus, 'utf8') }
  }
  const zweiMal502 = mergen(1, { fehler: 2, meldung: 'non-200 OK status code: 502 Bad Gateway body: "<html>"' })
  pruefe('Merge: zweimal 502, dann Erfolg → gemerged=true nach drei Versuchen', zweiMal502.status === 0 && zweiMal502.aufrufe === 3 && /gemerged=true/.test(zweiMal502.ausgabe), `${zweiMal502.status} ${zweiMal502.aufrufe} ${zweiMal502.out.slice(-300)}`)
  pruefe('Merge: 5xx-Pausen wachsen (15, 30 s)', zweiMal502.pausen === '15,30', zweiMal502.pausen)
  const wasWrong = mergen(2, { fehler: 1, meldung: 'GraphQL: Something went wrong while executing your query on 2026-11-25T16:08:29Z. Please include `D8E7` when reporting this issue.' })
  pruefe('Merge: „Something went wrong while executing your query" zählt als Serverfehler', wasWrong.pausen === '15' && /gemerged=true/.test(wasWrong.ausgabe), `${wasWrong.pausen} ${wasWrong.out.slice(-200)}`)
  const schonGemergt = mergen(3, { fehler: 9, meldung: 'HTTP 502: Bad Gateway', gemergt: true })
  pruefe('Merge: 502, PR aber schon gemergt → kein weiterer Versuch, gemerged=true', schonGemergt.status === 0 && schonGemergt.aufrufe === 1 && /gemerged=true/.test(schonGemergt.ausgabe), `${schonGemergt.status} ${schonGemergt.aufrufe} ${schonGemergt.out.slice(-300)}`)
  const immer502 = mergen(4, { fehler: 99, meldung: 'HTTP 503: Service Unavailable' })
  pruefe('Merge: dauerhaft 5xx → fünf Versuche (vier Pausen 15/30/60/120 s), dann rot', immer502.status !== 0 && immer502.aufrufe === 5 && immer502.pausen === '15,30,60,120' && /gemerged=false/.test(immer502.ausgabe), `${immer502.status} ${immer502.aufrufe} ${immer502.pausen}`)
  const ohnePause = mergen(5, { fehler: 1, meldung: 'HTTP 502: Bad Gateway', faktor: 'QUELLEN_PAUSE_FAKTOR=0' })
  pruefe('Merge: QUELLEN_PAUSE_FAKTOR=0 stellt die 5xx-Pause auf 0 s', ohnePause.aufrufe === 2 && /^0$/m.test(readFileSync(join(bin3, 'pausen'), 'utf8')), readFileSync(join(bin3, 'pausen'), 'utf8'))
  const basis = mergen(6, { fehler: 99, meldung: 'GraphQL: Base branch was modified. Review and try the merge again.' })
  pruefe('Merge: „Base branch was modified" bleibt kurz: sechs Versuche, keine Pause ab 15 s', basis.status !== 0 && basis.aufrufe === 6 && !/(^|,)(15|30|60|120)(,|$)/.test(basis.pausen) && /Merge-Versuch 6 von 6 abgelehnt/.test(basis.out), `${basis.status} ${basis.aufrufe} ${basis.pausen}`)
  pruefe('Merge: die Meldung der Nicht-5xx-Ablehnung nennt den echten Grund', /abgelehnt: GraphQL: Base branch was modified/.test(basis.out), basis.out.slice(-300))
  const nachBasis = mergen(7, { fehler: 2, meldung: 'GraphQL: Base branch was modified. Review and try the merge again.' })
  pruefe('Merge: zweimal „Base branch was modified", dann Erfolg', nachBasis.aufrufe === 3 && /gemerged=true/.test(nachBasis.ausgabe), `${nachBasis.aufrufe} ${nachBasis.out.slice(-200)}`)

  // Text-Zweig der Aktion `einreichen`: die Nachricht kommt über env, nie in den Skripttext (ein `"` würde sonst Code mit dem App-Token ausführen).
  const aktion = YAML.parse(readFileSync(join(wurzel, '.github/actions/einreichen/action.yml'), 'utf8'))
  const schritt = aktion.runs.steps.find((s) => s.id === 'pr')
  pruefe('Aktion einreichen: der Schritt `pr` setzt keinen Ausdruck in den Skripttext', typeof schritt?.run === 'string' && !schritt.run.includes('${{'), schritt?.run)
  pruefe('Aktion einreichen: die Nachricht kommt über env NACHRICHT und wird in Anführungszeichen übergeben', schritt?.env?.NACHRICHT === '${{ inputs.nachricht }}' && /quellen-pr\.sh "\$NACHRICHT"/.test(schritt?.run ?? ''), schritt)
  const boese = `fund "x"; touch "${posix(dir)}/PWNED1"; echo '$(touch ${posix(dir)}/PWNED2)' \`touch ${posix(dir)}/PWNED3\` \\"`
  writeFileSync(join(bin3, 'merge-aufrufe'), '')
  writeFileSync(join(bin3, 'merge-fehler'), '0')
  writeFileSync(join(lauf, 'data/cinestar.json'), '{"aktion":1}')
  const ra = sh(lauf, `PATH="${posix(bin3)}:$PATH" GITHUB_RUN_ID=961 QUELLEN_PRUEFBEFEHL=true ${schritt.run}`, { NACHRICHT: boese })
  const createArgs = readFileSync(join(bin3, 'create-args'), 'utf8').split('\n')
  pruefe('Aktion einreichen: Anführungszeichen und Shell-Zeichen der Nachricht landen unverändert als Titel', ra.status === 0 && createArgs[createArgs.indexOf('--title') + 1] === boese, createArgs)
  pruefe('Aktion einreichen: die Nachricht schleust keinen Code ein', !['PWNED1', 'PWNED2', 'PWNED3'].some((n) => existsSync(join(dir, n))), ra.out.slice(-300))
} finally {
  rmSync(dir, { recursive: true, force: true })
}

if (fehler.length) {
  console.error(`\n${fehler.length} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('quellen-pr.sh: alle Zusicherungen gehalten.')
