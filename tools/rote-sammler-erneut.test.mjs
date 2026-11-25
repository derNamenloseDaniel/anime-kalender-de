/**
 * Marke „[Prüfung rot]“ fällt von selbst (tools/rote-sammler-erneut.mjs und .sh, 25.11.2026).
 * Teil A: Entscheidung und Kommentarwortlaut. Teil B: der Ablauf mit echtem git (Wegwerf-Repos unter os.tmpdir(), PR-Stand unter refs/pull/<n>/head),
 * nachgebautem `gh` (schreibt jeden Aufruf mit) und einer Wegwerf-Prüfung (`QUELLEN_PRUEFBEFEHL`, auf dem PR-Stand und auf main).
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KOMMENTAR_KENNUNG, entscheide, ohneMarke } from './rote-sammler-erneut.mjs'
import { MARKE } from './rote-sammler-prs.mjs'

const tools = dirname(fileURLToPath(import.meta.url))
const posix = (p) => p.replace(/\\/g, '/')
let faelle = 0
const pruefe = (name, bedingung, detail = '') => {
  faelle++
  if (!bedingung) {
    console.error(`  ✖ ${name}`, detail)
    process.exit(1)
  }
}

// Teil A — Entscheidung
pruefe('grün: freigeben', entscheide('gruen').freigeben === true)
pruefe('rot, aber nur wie main: freigeben', entscheide('gleich').freigeben === true)
pruefe('neue Fehler: bleibt, Kommentar nennt die Zeilen', !entscheide('neu', '  - tools/a.ts').freigeben && entscheide('neu', '  - tools/a.ts').kommentar.includes('  - tools/a.ts'))
pruefe('Konflikt: bleibt', !entscheide('konflikt').freigeben)
pruefe('jeder Kommentar trägt die Kennung', ['gruen', 'gleich', 'neu', 'konflikt'].every((b) => entscheide(b).kommentar.startsWith(KOMMENTAR_KENNUNG)))
pruefe('Kommentar nennt höchstens 20 Zeilen', entscheide('neu', Array.from({ length: 30 }, (_, i) => `  - z${i}`).join('\n')).kommentar.split('\n').filter((z) => z.startsWith('  - z')).length === 20)
pruefe('unbekannter Befund wirft', (() => { try { entscheide('x'); return false } catch { return true } })())
pruefe('Marke wird vom Titel genommen, ein Titel ohne Marke bleibt', ohneMarke(`${MARKE} chore(data): X`) === 'chore(data): X' && ohneMarke('chore(data): X') === 'chore(data): X')
const text = (datei) => readFileSync(join(tools, datei), 'utf8')
const konstante = (datei, name) => text(datei).match(new RegExp(`^${name}=(["'])(.*)\\1$`, 'm'))?.[2]
pruefe('Marke, Label und Kennung stehen in Skript, Einreicher und Modul gleich', konstante('rote-sammler-erneut.sh', 'MARKE_ROT') === MARKE && konstante('quellen-pr.sh', 'MARKE_ROT') === MARKE
  && konstante('rote-sammler-erneut.sh', 'LABEL_ROT') === konstante('quellen-pr.sh', 'LABEL_ROT') && konstante('rote-sammler-erneut.sh', 'KENNUNG') === KOMMENTAR_KENNUNG)

// Teil B — Ablauf
const KOPIEN = ['rote-sammler-erneut.sh', 'rote-sammler-erneut.mjs', 'rote-sammler-prs.mjs', 'kind-mit-limit.mjs', 'quellen-pruefen.sh']
const GIT = ['-c', 'user.name=t', '-c', 'user.email=t@t']
const git = (cwd, ...args) => {
  const r = spawnSync('git', [...GIT, ...args], { cwd, encoding: 'utf8', windowsHide: true })
  assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`)
  return r.stdout
}

/** Nachgebautes gh: Titel je PR aus `titel-<n>`, vorhandener Hinweis aus `kommentar-id`; jeder Aufruf geht nach aufrufe.txt, Kommentartexte nach kommentar.txt. */
function schreibeGh(bin, d) {
  writeFileSync(join(bin, 'gh'), `#!/bin/bash
echo "$*" >> "${d}/aufrufe.txt"
case "$1 $2" in
  "pr view") cat "${d}/titel-$3" ;;
  "pr edit") ;;
  "pr comment") cp "$5" "${d}/kommentar.txt" ;;
  "api repos/x/y/issues/7/comments") [ -f "${d}/kommentar-id" ] && cat "${d}/kommentar-id" ;;
  "api -X") while [ $# -gt 0 ]; do case "$1" in body=@*) cp "\${1#body=@}" "${d}/kommentar.txt" ;; esac; shift; done ;;
esac
exit 0
`)
  chmodSync(join(bin, 'gh'), 0o755)
}

/** Ein Durchgang für PR 7: `pr` ist der Inhalt von data/x.txt im PR, `main2` ändert main danach (ein Konflikt, wenn er x.txt anfasst); `pruefung` ist die Prüfung. */
function szenario({ pruefung, titel = `${MARKE} chore(data): Test`, pr = 'v2', main2 = 'neu.txt', vorhandenerHinweis = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'rote-sammler-erneut-'))
  try {
    const bin = join(dir, 'bin')
    mkdirSync(bin)
    schreibeGh(bin, dir)
    writeFileSync(join(dir, 'titel-7'), `${titel}\n`)
    if (vorhandenerHinweis) writeFileSync(join(dir, 'kommentar-id'), '4711\n')
    git(dir, 'init', '-q', '--bare', '-b', 'main', 'ursprung.git')
    git(dir, 'clone', '-q', 'ursprung.git', 'lauf')
    const lauf = join(dir, 'lauf')
    mkdirSync(join(lauf, 'data'))
    mkdirSync(join(lauf, 'tools'))
    for (const k of KOPIEN) copyFileSync(join(tools, k), join(lauf, 'tools', k))
    writeFileSync(join(lauf, 'data/x.txt'), 'v1')
    git(lauf, 'add', '-A')
    git(lauf, 'commit', '-q', '-m', 'start')
    git(lauf, 'push', '-q', 'origin', 'HEAD:main')
    // PR-Stand: x.txt geändert, als refs/pull/7/head veröffentlicht.
    git(lauf, 'checkout', '-q', '-b', 'pr')
    writeFileSync(join(lauf, 'data/x.txt'), pr)
    git(lauf, 'commit', '-q', '-am', 'fund')
    git(lauf, 'push', '-q', 'origin', 'HEAD:refs/pull/7/head')
    // main läuft weiter: entweder eine neue Datei (konfliktfrei) oder dieselbe Zeile wie der PR (Konflikt).
    git(lauf, 'checkout', '-q', 'main')
    writeFileSync(join(lauf, `data/${main2}`), main2 === 'x.txt' ? 'andere' : 'neu')
    git(lauf, 'add', '-A')
    git(lauf, 'commit', '-q', '-m', 'main weiter')
    git(lauf, 'push', '-q', 'origin', 'main')
    const ausgabe = join(dir, 'ausgabe.txt')
    writeFileSync(ausgabe, '')
    const r = spawnSync('bash', ['tools/rote-sammler-erneut.sh', '7'], {
      cwd: lauf,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        PATH: `${posix(bin)}:${process.env.PATH}`,
        GITHUB_OUTPUT: posix(ausgabe),
        GITHUB_REPOSITORY: 'x/y',
        GH_TOKEN: 'geheim-attrappe',
        QUELLEN_PRUEFBEFEHL: pruefung.replaceAll('$MARKE', `${posix(dir)}/pruefung-lief`),
        QUELLEN_PRUEFFRIST: '60',
      },
    })
    const lies = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8') : '')
    return { status: r.status, out: r.stdout + r.stderr, ausgabe: lies('ausgabe.txt'), aufrufe: lies('aufrufe.txt'), kommentar: lies('kommentar.txt'), lief: existsSync(join(dir, 'pruefung-lief')) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const rotMitFund = 'touch "$MARKE"; if grep -q v2 data/x.txt; then echo "  - tools/a.ts"; exit 1; fi'
const gruen = szenario({ pruefung: 'touch "$MARKE"; test -f data/neu.txt' })
pruefe('grün auf dem mit main zusammengeführten Stand (neue Datei von main ist da): Titel ohne Marke, Label weg, Nummer in der Ausgabe', gruen.status === 0 && /pr edit 7 --title chore\(data\): Test\n/.test(gruen.aufrufe) && /pr edit 7 --remove-label pruefung-rot/.test(gruen.aufrufe) && gruen.ausgabe === 'freigegeben=7\n', [gruen.status, gruen.aufrufe, gruen.ausgabe, gruen.out.slice(-400)])
pruefe('grün: Hinweis angelegt, mit der Kennung', gruen.kommentar.startsWith(KOMMENTAR_KENNUNG) && /pr comment 7 --body-file/.test(gruen.aufrufe), gruen.kommentar)
const neuRot = szenario({ pruefung: rotMitFund })
pruefe('rot mit neuem Fehler: bleibt, nichts am Titel oder Label, Grund im Hinweis, Ausgabe leer', neuRot.status === 0 && !/pr edit/.test(neuRot.aufrufe) && neuRot.kommentar.includes('  - tools/a.ts') && neuRot.ausgabe === 'freigegeben=\n', [neuRot.status, neuRot.aufrufe, neuRot.kommentar])
const gleichRot = szenario({ pruefung: 'touch "$MARKE"; echo "  - tools/a.ts"; exit 1' })
pruefe('rot, main hat dieselbe Prüfung rot: Marke weg (Basis gleich)', gleichRot.status === 0 && /pr edit 7 --title chore\(data\): Test\n/.test(gleichRot.aufrufe) && gleichRot.ausgabe === 'freigegeben=7\n', [gleichRot.aufrufe, gleichRot.out.slice(-400)])
const konflikt = szenario({ pruefung: 'touch "$MARKE"', main2: 'x.txt' })
pruefe('Konflikt mit main: bleibt, die Prüfung läuft nicht, der Hinweis nennt den Konflikt', konflikt.status === 0 && !konflikt.lief && !/pr edit/.test(konflikt.aufrufe) && /Konflikt|konfliktfrei/.test(konflikt.kommentar) && konflikt.ausgabe === 'freigegeben=\n', [konflikt.status, konflikt.lief, konflikt.aufrufe, konflikt.kommentar])
const zweiter = szenario({ pruefung: rotMitFund, vorhandenerHinweis: true })
pruefe('zweiter Durchgang, weiter rot: der vorhandene Hinweis wird ersetzt, kein zweiter angelegt', /api -X PATCH repos\/x\/y\/issues\/comments\/4711/.test(zweiter.aufrufe) && !/pr comment/.test(zweiter.aufrufe) && zweiter.kommentar.includes('  - tools/a.ts'), [zweiter.aufrufe, zweiter.kommentar])
const ohneMarkeFall = szenario({ pruefung: 'touch "$MARKE"', titel: 'chore(data): Test' })
pruefe('PR ohne Marke: übersprungen, nichts geprüft, nichts geändert', ohneMarkeFall.status === 0 && !ohneMarkeFall.lief && !/pr edit|pr comment/.test(ohneMarkeFall.aufrufe), ohneMarkeFall.aufrufe)
pruefe('das Token der Aktion sieht die Prüfung nie (GH_TOKEN ist dort entfernt)', szenario({ pruefung: 'touch "$MARKE"; test -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}"' }).ausgabe === 'freigegeben=7\n')

console.log(`rote-sammler-erneut: ${faelle} Fälle grün.`)
