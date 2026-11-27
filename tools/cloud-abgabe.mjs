/**
 * Cloud-Abgabe (26.11.2026): Eine Cloud-Routine liefert ihre Arbeit als Code-Zweig plus Zweig `prtext/<auftrag>` mit `pr.md`
 * (erste Zeile `<!-- titel: … -->`, optional `<!-- zweig: … -->`, dann der PR-Text) und `bericht.md`. Dieses Werkzeug (Workflow
 * `cloud-abgabe.yml`) legt daraus den PR an oder hängt den Bericht als Nachtrag an den offenen PR, und setzt das Label `stufe-0|1|2`.
 * Reine Logik hier, gh-Aufrufe in `cloud-abgabe-welt.mjs` (Tests setzen eine Attrappe-Welt ein). Nur Node-Bordmittel.
 *
 *   node tools/cloud-abgabe.mjs <prtext/auftrag>
 *
 * Exit 0 = erledigt (auch „schon abgegeben“), 2 = Eingabe- oder Abruffehler (Code-Zweig fehlt oder mehrdeutig, pr.md ohne Titel,
 * gh-Fehler): nie raten, nie still. Die Beschreibung eines vorhandenen PR wird nie geändert; pr.md und bericht.md sind Daten und
 * gehen nur als Dateiinhalt/JSON an die API, nie in einen Shell-Befehl.
 */
import { pathToFileURL } from 'node:url'
import { bewerte, neueEintraege, neueVorratEintraege } from './check-patchnotes-pflicht.mjs'

export const PRTEXT = 'prtext/'
export const ENDZEILE = '🤖 Generated with [Claude Code](https://claude.com/claude-code)'
export const STUFEN = [0, 1, 2]
const VERBOTEN = /^(main$|prtext\/|daten\/)/
const ZWEIG_FORM = /^[A-Za-z0-9._/-]+$/

const abbruch = (text) => {
  throw new Error(text)
}

/** Titel und Zweig-Zeile aus `pr.md`; `text` ist der PR-Text unverändert (pr.md wörtlich, nur die Endzeile fehlt ggf.). */
export function liesPrText(md) {
  const titel = /^<!--\s*titel:\s*(.+?)\s*-->\s*$/m.exec(md)?.[1] ?? null
  const zweig = /^<!--\s*zweig:\s*(.+?)\s*-->\s*$/m.exec(md)?.[1] ?? null
  return { titel, zweig, text: md }
}

/** PR-Text mit der Endzeile (angehängt, falls sie fehlt). */
export function mitEndzeile(text) {
  return text.includes(ENDZEILE) ? text : `${text.replace(/\s+$/, '')}\n\n${ENDZEILE}\n`
}

/** Mögliche Code-Zweige ohne Zeile `zweig:`: `fix/<auftrag>` und ohne Nachbesserungs-Suffix (`-r1`, `-r1b`) `fix/<rumpf>`. */
export function codeZweigKandidaten(auftrag) {
  const rumpf = auftrag.replace(/-r\d+[a-z]?$/, '')
  return [...new Set([`fix/${auftrag}`, `fix/${rumpf}`])]
}

/** Gültiger Zweigname aus `pr.md`: nur Zeichen eines Zweignamens, nie main, prtext/… oder daten/…. */
export const zweigErlaubt = (z) => ZWEIG_FORM.test(z) && !z.includes('..') && !VERBOTEN.test(z)

/** Der Code-Zweig der Abgabe: Zeile `zweig:` gilt (geprüft), sonst genau ein vorhandener Kandidat. */
export function codeZweig(auftrag, zeile, welt) {
  if (zeile !== null) {
    if (!zweigErlaubt(zeile)) abbruch(`pr.md nennt einen unzulässigen Zweig „${zeile}“`)
    if (welt.zweigSha(zeile) === null) abbruch(`Code-Zweig „${zeile}“ (Zeile zweig: in pr.md) existiert nicht`)
    return zeile
  }
  const kandidaten = codeZweigKandidaten(auftrag)
  const da = kandidaten.filter((z) => welt.zweigSha(z) !== null)
  if (da.length === 0) abbruch(`kein Code-Zweig gefunden (gesucht: ${kandidaten.join(', ')}); Zeile <!-- zweig: … --> in pr.md ergänzen`)
  if (da.length > 1) abbruch(`Code-Zweig mehrdeutig (${da.join(', ')}); Zeile <!-- zweig: … --> in pr.md ergänzen`)
  return da[0]
}

/**
 * Patch-Notes-Pflicht der PR-Kette (`bewerte` in check-patchnotes-pflicht.mjs, dieselbe Regel wie die Vorprüfung) vor dem Anlegen: Eine Abgabe, die sie
 * verletzt, öffnete bisher einen roten PR (Cloud-Welle 5130–5146, 27.11.2026). `welt.aenderungen(zweig)` liefert die Zeilen `A<Tab>Pfad` / `M<Tab>Pfad` gegen main.
 */
export function patchNotesPruefen({ titel, text, zweig }, welt) {
  const nameStatus = welt.aenderungen(zweig)
  const dateien = nameStatus.split('\n').map((z) => z.split('\t')[1]).filter(Boolean)
  const urteil = bewerte({ dateien, neu: neueEintraege(nameStatus), beschreibung: text, zweig, vorrat: neueVorratEintraege(nameStatus), titel })
  if (!urteil.ok) abbruch(`pr.md verletzt die Patch-Notes-Pflicht, kein PR angelegt: ${urteil.grund}`)
}

/** Erste Zeile des Nachtrags; der Kopf-sha macht die Abgabe idempotent. */
export const nachtragKopf = (sha) => `## Nachtrag (Cloud-Bericht, Kopf ${sha.slice(0, 7)})`
export const nachtragText = (sha, bericht) => `${nachtragKopf(sha)}\n\n${bericht.replace(/\s+$/, '')}\n`
export const hatNachtrag = (kommentare, sha) => kommentare.some((k) => String(k).split('\n')[0].trim() === nachtragKopf(sha))

/** Label `stufe-N` setzen, veraltete `stufe-*` entfernen, Label nur anlegen, wenn es fehlt. */
export function stufeSetzen(nr, stufe, welt) {
  if (!STUFEN.includes(stufe)) abbruch(`Prüfstufe „${stufe}“ unbekannt`)
  const soll = `stufe-${stufe}`
  const vorhanden = welt.labels(nr)
  for (const l of vorhanden) if (/^stufe-\d+$/.test(l) && l !== soll) welt.labelEntfernen(nr, l)
  if (vorhanden.includes(soll)) return
  welt.labelAnlegen(soll)
  welt.labelSetzen(nr, soll)
}

/** Eine Abgabe verarbeiten; Rückgabe: Zeile für das Protokoll. Wirft bei jedem Fehlerfall. */
export function abgabe(zweig, welt) {
  if (!zweig.startsWith(PRTEXT) || zweig.length === PRTEXT.length || !ZWEIG_FORM.test(zweig)) abbruch(`„${zweig}“ ist kein prtext-Zweig`)
  const auftrag = zweig.slice(PRTEXT.length)
  const prMd = welt.datei(zweig, 'pr.md')
  if (prMd === null) abbruch(`${zweig}: pr.md fehlt`)
  const { titel, zweig: zeile, text } = liesPrText(prMd)
  const code = codeZweig(auftrag, zeile, welt)
  const sha = welt.zweigSha(code)
  const bericht = welt.datei(zweig, 'bericht.md')
  let pr = welt.offenerPr(code)
  let angelegt = false
  if (pr === null) {
    if (titel === null) abbruch(`${zweig}: pr.md hat keine erste Zeile <!-- titel: … -->`)
    patchNotesPruefen({ titel, text, zweig: code }, welt)
    pr = welt.prAnlegen({ titel, text: mitEndzeile(text), zweig: code })
    // 422 „existiert schon“ (zwei Abgaben gleichzeitig): auf den Nachtragsweg wechseln, nie ein zweiter PR.
    if (pr === null) pr = welt.offenerPr(code) ?? abbruch(`PR für ${code} nicht anlegbar und nicht auffindbar`)
    else angelegt = true
  }
  let kommentar = 'ohne bericht.md'
  if (bericht !== null && bericht.trim() !== '') {
    if (hatNachtrag(welt.kommentare(pr.nummer), sha)) kommentar = 'Nachtrag lag schon vor'
    else {
      welt.kommentarSchreiben(pr.nummer, nachtragText(sha, bericht))
      kommentar = 'Nachtrag geschrieben'
    }
  }
  const stufe = welt.stufe(pr.nummer)
  stufeSetzen(pr.nummer, stufe, welt)
  return `${angelegt ? 'PR angelegt' : 'offener PR'} #${pr.nummer} (${code}, Kopf ${sha.slice(0, 7)}): ${kommentar}; Label stufe-${stufe}`
}

/** Einstieg; Rückgabe ist der Exit-Code. */
export function lauf(args, welt) {
  if (args.length !== 1) {
    welt.zeile('Aufruf: node tools/cloud-abgabe.mjs <prtext/auftrag>')
    return 2
  }
  try {
    welt.zeile(abgabe(args[0], welt))
    return 0
  } catch (e) {
    welt.zeile(`FEHLER: ${e.message}`)
    return 2
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { echteWelt } = await import('./cloud-abgabe-welt.mjs')
  try {
    process.exitCode = lauf(process.argv.slice(2), echteWelt())
  } catch (e) {
    console.log(`FEHLER: ${e.message}`)
    process.exitCode = 2
  }
}
