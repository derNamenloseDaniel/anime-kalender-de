// Holt wartende Aufgaben von selbst von „### Später“ nach „### Jetzt“ in stand.md (Daniel, 23.11.2026: nicht für immer vergessen,
// auch wenn die Sitzung endet und der Zustand erst morgen eintritt). Läuft bei SessionStart und gedrosselt bei UserPromptSubmit.
// Zeile unter „### Später“: `- ⏳ [Titel](file:///…/jetzt/x.md) — Text {wartet: pr:4763 + live:"text" + ab:24.11.2026 08:00 → 🔴}`
// Bedingungen (alle müssen gelten): pr:<n> gemergt · live:"<text>" steht in den JS-Bundles von anime-kalender.de (nur Zeichenketten, die im Artefakt
// stehen: String-Literal, Oberflächentext, Datenfeld, nie Bezeichner; Lazy-Chunks werden mitgelesen) · ab:TT.MM.JJJJ HH:MM (Berlin).
// prüfen:TT.MM.JJJJ: nie automatisch verschoben, ab dem Datum einmal je Tag die Meldung „von Hand prüfen“.
// Netzfehler heißt „nicht erfüllt“: nie verschieben, nie abbrechen. Eine erfüllte Meldung bleibt im Zustand (`ungemeldet`), bis sie ausgegeben wurde.
import { execFile, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { berlinEpoche } = require('./stand-waechter.js')
const H = dirname(fileURLToPath(import.meta.url))

export const REPO = 'derNamenloseDaniel/anime-kalender-de'
export const LIVE_URL = 'https://anime-kalender.de/'
export const DROSSEL_MS = 10 * 60000
export const GESAMT_PROMPT_MS = 3000
export const GESAMT_START_MS = 10000
const MAX_TIEFE = 3
const MAX_DATEIEN = 80
const STATE = process.env.WARTET_STATE || join(homedir(), '.claude', 'hooks', 'state', 'wartet-auf.json')
const WARTET = /\{wartet:\s*(.+?)\s*→\s*(\S+)\s*\}\s*$/u
const KENNUNG = /\b[FE]\d+\b/
const pad = (n) => String(n).padStart(2, '0')

/** Berliner Wandzeit zu `ms`: Teile als Zahlen. */
function berlinTeile(ms) {
  const t = Object.fromEntries(
    new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  )
  return { j: t.year, m: t.month, t: t.day, h: t.hour, min: t.minute }
}
const datumBerlin = (ms) => { const b = berlinTeile(ms); return `${b.t}.${b.m}.${b.j}` }

/** Teilt `a + b` an Plus mit Leerzeichen, nicht innerhalb von Anführungszeichen. */
function trenne(text) {
  const teile = []
  let aktuell = ''
  let quote = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') quote = !quote
    if (!quote && c === '+' && /\s/.test(text[i - 1] || '') && /\s/.test(text[i + 1] || '')) {
      teile.push(aktuell.trim())
      aktuell = ''
    } else aktuell += c
  }
  teile.push(aktuell.trim())
  return teile
}

/** Eine Bedingung als Objekt oder null (nicht verstanden). */
export function bedingung(text) {
  let m = /^pr:(\d+)$/.exec(text)
  if (m) return { art: 'pr', nr: Number(m[1]) }
  m = /^live:"(.+)"$/.exec(text)
  if (m) return { art: 'live', text: m[1] }
  m = /^ab:(\d\d)\.(\d\d)\.(\d{4}) (\d\d):(\d\d)$/.exec(text)
  if (m) return { art: 'ab', ms: berlinEpoche(Number(m[3]), Number(m[2]), Number(m[1]), Number(m[4]), Number(m[5])) }
  m = /^prüfen:(\d\d)\.(\d\d)\.(\d{4})$/u.exec(text)
  if (m) return { art: 'pruefen', ms: berlinEpoche(Number(m[3]), Number(m[2]), Number(m[1]), 0, 0) }
  return null
}

/** Zeilen unter „### Später“ mit `{wartet`: { index, zeile, kennung, icon, bedingungen }. Eine Zeile, deren Klammer nicht
 *  `{wartet: … → <Icon>}` am Zeilenende ist, trägt `bedingungen: null` und wird als „unlesbar“ gemeldet, nie still übersprungen. */
export function wartende(zeilen) {
  const kopf = zeilen.findIndex((z) => z.startsWith('### Später'))
  if (kopf < 0) return []
  let ende = zeilen.findIndex((z, i) => i > kopf && z.startsWith('#'))
  if (ende < 0) ende = zeilen.length
  const liste = []
  for (let i = kopf + 1; i < ende; i++) {
    if (!zeilen[i].startsWith('- ') || !zeilen[i].includes('{wartet')) continue
    const w = WARTET.exec(zeilen[i])
    const k = KENNUNG.exec(zeilen[i].replace(/\]\([^)]*\)/g, ']'))
    const kennung = k ? k[0] : zeilen[i].slice(2, 40)
    if (!w) liste.push({ index: i, zeile: zeilen[i], kennung, icon: null, bedingungen: null })
    else liste.push({ index: i, zeile: zeilen[i], kennung, icon: w[2], bedingungen: trenne(w[1]).map((t) => ({ roh: t, b: bedingung(t) })) })
  }
  return liste
}

/** Jetzt-Zeile `- <Icon> [Titel](link)` aus der Später-Zeile (ohne „— …“ und `{wartet…}`). */
export function jetztZeile(zeile, icon) {
  const l = /\[([^\]]+)\]\(([^)]+)\)/.exec(zeile)
  if (l) return `- ${icon} [${l[1]}](${l[2]})`
  const b = /\*\*(.+?)\*\*/.exec(zeile)
  return `- ${icon} **${b ? b[1] : zeile.replace(/^- \S+\s*/u, '').replace(WARTET, '').split(' — ')[0].trim()}**`
}

/** Jetzt-Datei: „erst handeln, wenn“-Warnzeile weg, Stand-Zeile auf `ms`. */
export function dateiFreigeben(text, ms) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const b = berlinTeile(ms)
  const stand = `*Stand: ${b.t}.${b.m}.${b.j} ${b.h}:${b.min}*`
  const alle = text.split(/\r?\n/)
  const warnung = (z) => /^> ⚠ \*\*(?:Kann veraltet sein|Verfallen):\*\*/.test(z) && /erst handeln, wenn/.test(z)
  // Die Leerzeile hinter der Warnzeile geht mit, sonst bleibt ein doppelter Abstand.
  const zeilen = alle.filter((z, i) => !warnung(z) && !(i > 0 && warnung(alle[i - 1]) && z === ''))
    .map((z) => (/^\*Stand: .*\*\s*$/.test(z) ? stand : z))
  return zeilen.join(eol)
}

/** stand.md: Später-Zeile `index` entfernen, Jetzt-Zeile oben unter „### Jetzt“ einfügen, Stempel „Aktualisiert“ auf ISO-Zeit; null ohne „### Jetzt“. */
export function verschiebe(text, index, neu, ms) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const zeilen = text.split(/\r?\n/)
  zeilen.splice(index, 1)
  const jetzt = zeilen.findIndex((z) => z.startsWith('### Jetzt'))
  if (jetzt < 0) return null
  zeilen.splice(jetzt + 1, 0, neu)
  const b = berlinTeile(ms)
  const a = zeilen.findIndex((z) => z.startsWith('Aktualisiert: '))
  if (a >= 0) zeilen[a] = zeilen[a].replace(/^Aktualisiert: (?:\d{4}-\d\d-\d\d|\d\d\.\d\d\.(?:\d{4})?) \d\d:\d\d/, `Aktualisiert: ${b.j}-${b.m}-${b.t} ${b.h}:${b.min}`)
  return zeilen.join(eol)
}

/** `gh pr view` → gemergt? Fehler/Timeout = false. */
export function prGemergt(nr, grenzeMs = GESAMT_START_MS) {
  return new Promise((ok) => {
    execFile('gh', ['pr', 'view', String(nr), '--repo', REPO, '--json', 'mergedAt'], { timeout: grenzeMs, windowsHide: true, encoding: 'utf8' }, (fehler, aus) => {
      try { ok(!fehler && Boolean(JSON.parse(aus).mergedAt)) } catch { ok(false) }
    })
  })
}

/** Script-src und modulepreload-href (.js) einer HTML-Seite als absolute Adressen. */
function urlsAusHtml(html) {
  return [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+\.js[^"]*)"/g)].map((m) => new URL(m[1], LIVE_URL).href)
}

/** Verweise auf weitere Chunks im Bundle `text` (`assets/x.js`, `/assets/x.js`, `./x.js`), `./` relativ zu `basis`. */
function chunkVerweise(text, basis) {
  const urls = [...text.matchAll(/["'`](\.\/[A-Za-z0-9_.-]+\.js|\/?assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)]
    .map((m) => new URL(m[1], m[1].startsWith('./') ? basis : LIVE_URL).href)
  return [...new Set(urls)]
}

/** Text der JS-Bundles der Live-Seite: index.html, Script/modulepreload und, bis `MAX_TIEFE` Ebenen tief (höchstens `MAX_DATEIEN` Dateien), die
 *  Lazy-Chunks, auf die ein Bundle verweist. Ein Abruf je Datei, Gesamtfrist `grenzeMs`; jeder Fehler = null (Nichtauskunft). */
export async function liveBundles(abruf = fetch, grenzeMs = GESAMT_START_MS) {
  const signal = AbortSignal.timeout(grenzeMs)
  const geholt = new Map()
  try {
    const html = await (await abruf(LIVE_URL, { signal })).text()
    let stufe = urlsAusHtml(html)
    for (let tiefe = 0; stufe.length && tiefe <= MAX_TIEFE; tiefe++) {
      const neu = [...new Set(stufe)].filter((u) => !geholt.has(u)).slice(0, MAX_DATEIEN - geholt.size)
      const texte = await Promise.all(neu.map(async (u) => {
        const r = await abruf(u, { signal })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      }))
      stufe = []
      neu.forEach((u, i) => {
        geholt.set(u, texte[i])
        stufe.push(...chunkVerweise(texte[i], u))
      })
    }
    return [...geholt.values()].join('\n')
  } catch {
    return null
  }
}

/** Alle Bedingungen einer Zeile erfüllt? `dienste`: { pr(nr), bundles() (memo), jetzt }. */
export async function erfuellt(bedingungen, dienste) {
  const ergebnisse = await Promise.all(bedingungen.map(async ({ b }) => {
    if (!b || b.art === 'pruefen') return false
    if (b.art === 'ab') return dienste.jetzt >= b.ms
    if (b.art === 'pr') return (await dienste.pr(b.nr)) === true
    const t = await dienste.bundles()
    return t != null && t.includes(b.text)
  }))
  return ergebnisse.every(Boolean)
}

/** Hauptordner des Repos (auch aus einem Worktree) oder null. */
export function hauptordner(von = H) {
  try {
    const gemeinsam = execFileSync('git', ['-C', von, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim()
    return dirname(gemeinsam)
  } catch {
    return null
  }
}

const liesJson = (pfad) => { try { return JSON.parse(readFileSync(pfad, 'utf8')) } catch { return {} } }
function schreibAtomar(pfad, text) {
  mkdirSync(dirname(pfad), { recursive: true })
  const tmp = `${pfad}.${process.pid}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, pfad)
}

/** Eine Zeile bearbeiten: Meldung oder ''. `ctx`: { standPfad, ms, dienste, gemeldet }. */
async function bearbeite(w, ctx) {
  const heute = datumBerlin(ctx.ms)
  const einmalTaeglich = (schluessel, text) => {
    if (ctx.gemeldet[schluessel] === heute) return ''
    ctx.gemeldet[schluessel] = heute
    return text
  }
  if (!w.bedingungen) return einmalTaeglich(`${w.kennung}:unlesbar`, `[Wartet unlesbar] ${w.kennung}: {wartet: …} muss am Zeilenende stehen und auf „→ <Icon>}“ enden — Zeile korrigieren`)
  const pruefen = w.bedingungen.find((x) => x.b?.art === 'pruefen')
  const unlesbar = w.bedingungen.filter((x) => !x.b)
  if (unlesbar.length) return einmalTaeglich(`${w.kennung}:unlesbar`, `[Wartet unlesbar] ${w.kennung}: Bedingung „${unlesbar[0].roh}“ nicht verstanden — {wartet: …} korrigieren`)
  if (pruefen) return ctx.ms >= pruefen.b.ms ? einmalTaeglich(`${w.kennung}:pruefen`, `[Wartet prüfen] ${w.kennung}: Bedingung von Hand prüfen`) : ''
  if (!(await erfuellt(w.bedingungen, ctx.dienste))) return ''
  return verschiebeInDatei(w, ctx)
}

/** Erfüllte Zeile nach „Jetzt“ holen: Jetzt-Datei zuerst, dann stand.md frisch gelesen und gegengeprüft (eine zwischenzeitlich entfernte oder
 *  verschobene Zeile wird nicht noch einmal angefasst); ein Abbruch dazwischen holt beim nächsten Lauf idempotent nach. */
function verschiebeInDatei(w, ctx) {
  // Laufwerk (Daniels Rechner) oder POSIX-Pfad (CI): fileURLToPath löst beide auf.
  const link = /\]\((file:\/\/\/(?:[A-Za-z]:)?\/?[^)\s#]*\.md)\)/i.exec(w.zeile)
  if (link) {
    try {
      const pfad = fileURLToPath(link[1])
      if (existsSync(pfad)) schreibAtomar(pfad, dateiFreigeben(readFileSync(pfad, 'utf8'), ctx.ms))
    } catch { /* Jetzt-Datei unlesbar: Zeile trotzdem holen */ }
  }
  const text = readFileSync(ctx.standPfad, 'utf8')
  const index = text.split(/\r?\n/).indexOf(w.zeile)
  if (index < 0) return ''
  const neu = verschiebe(text, index, jetztZeile(w.zeile, w.icon), ctx.ms)
  if (neu == null) return ''
  schreibAtomar(ctx.standPfad, neu)
  return `[Wartet erfüllt] ${w.kennung} nach Jetzt geholt — Daniel im Chat Bescheid geben`
}

/** Meldungen des Zustands ausgeben und leeren (`ungemeldet`): was ein abgebrochener Lauf schon verschoben hat, kommt so beim nächsten Lauf. */
function ausgeben(st, statePfad) {
  const texte = st.ungemeldet || []
  if (texte.length) schreibAtomar(statePfad, JSON.stringify({ ...st, ungemeldet: [] }))
  return texte.join('\n')
}

/** Ein Durchlauf; `opt`: { standPfad, ms, dienste, statePfad, drosseln }. Gibt die Meldungen als Text zurück. Zeilen laufen parallel;
 *  `zuletzt` steht vor den Abrufen im Zustand (ein abgebrochener Lauf löst keinen Sturm aus), jede Meldung vor ihrer Ausgabe. */
export async function lauf(opt) {
  const standPfad = opt.standPfad
  if (!standPfad || !existsSync(standPfad)) return ''
  const st = liesJson(opt.statePfad)
  if (opt.drosseln && st.zuletzt && opt.ms - st.zuletzt < DROSSEL_MS) return ausgeben(st, opt.statePfad)
  const liste = wartende(readFileSync(standPfad, 'utf8').split(/\r?\n/))
  const gemeldet = { ...(st.gemeldet || {}) }
  schreibAtomar(opt.statePfad, JSON.stringify({ ...st, zuletzt: opt.ms }))
  const ergebnisse = await Promise.all(liste.map((w) => bearbeite(w, { standPfad, ms: opt.ms, dienste: opt.dienste, gemeldet }).catch(() => '')))
  const frisch = liesJson(opt.statePfad)
  const neu = { ...frisch, zuletzt: opt.ms, gemeldet, ungemeldet: [...(frisch.ungemeldet || []), ...ergebnisse.filter(Boolean)] }
  schreibAtomar(opt.statePfad, JSON.stringify(neu))
  return ausgeben(neu, opt.statePfad)
}

/** Echte Dienste: gh, Live-Seite (einmal je Lauf abgerufen), beide mit der Gesamtfrist. */
function echteDienste(ms, grenzeMs) {
  let bundles
  return { jetzt: ms, pr: (nr) => prGemergt(nr, grenzeMs), bundles: () => (bundles ??= liveBundles(fetch, grenzeMs)) }
}

/** Für den Verteiler und SessionStart: Meldungstext oder '' — Gesamtgrenze (Prompt 3 s, SessionStart 10 s), nie ein Fehler nach außen.
 *  `opt` überschreibt Quellen für Tests: { standPfad, statePfad, dienste, gesamtMs, ms }. */
export async function meldung(modus, opt = {}) {
  const gesamtMs = opt.gesamtMs ?? (modus === 'prompt' ? GESAMT_PROMPT_MS : GESAMT_START_MS)
  let timer
  const grenze = new Promise((ok) => { timer = setTimeout(() => ok(''), gesamtMs) })
  const arbeit = (async () => {
    const haupt = process.env.WARTET_STAND || opt.standPfad ? null : hauptordner()
    const standPfad = opt.standPfad || process.env.WARTET_STAND || (haupt && join(haupt, 'daniel-zum-abarbeiten', 'stand.md'))
    const ms = opt.ms ?? Date.now()
    return lauf({ standPfad, ms, dienste: opt.dienste || echteDienste(ms, gesamtMs), statePfad: opt.statePfad || STATE, drosseln: modus === 'prompt' })
  })().catch((err) => {
    process.stderr.write(`wartet-auf: ${err.message}\n`)
    return ''
  })
  const text = await Promise.race([arbeit, grenze])
  clearTimeout(timer)
  return text
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const text = await meldung(process.argv[2] === 'sessionstart' ? 'sessionstart' : 'prompt')
  if (text) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }))
  process.exit(0)
}
