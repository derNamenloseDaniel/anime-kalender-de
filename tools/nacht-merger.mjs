/**
 * Nacht-Merger (F99, Daniel 01.11.2026: „solang es nicht auf meinem PC läuft“): mergt offene PRs, die alle Kandidaten-Regeln
 * aus `nacht-merger-wahl.mjs` erfüllen und die `pr-nachrechnen` als mergebar bestätigt. Läuft als GitHub-Workflow
 * (`.github/workflows/nacht-merger.yml`, vom Cloudflare-Wecker stündlich per workflow_dispatch gestartet), nie auf Daniels Rechner.
 *
 *   node tools/nacht-merger.mjs [--trocken] [--hoechstens N]      (GH_TOKEN und GITHUB_REPOSITORY aus der Umgebung)
 *
 * Riegel: höchstens N Merges je Lauf (Vorgabe 3); jeder Merge und jede Abweisung steht mit Grund im Protokoll. `pr-nachrechnen`
 * liest nur: ein bewegter main hält einen Kandidaten nicht auf (seit 21.11.2026), nur ein Konflikt; nach einem Merge kommen die übrigen
 * Kandidaten im selben Lauf dran; das Zusammenspiel zeigt der Lauf auf main (`deploy.yml`). Kein `--admin`. Im Trockenlauf wird nichts gemergt.
 * Exit 0 sonst, 1 wenn ein Merge scheiterte, 2 bei Aufruffehlern.
 */
import { pathToFileURL } from 'node:url'
import { MIN_HASH } from './abnahme-freigabe.mjs'
import { freigabeVerworfen, kandidat, reihenfolge, vorabGrund } from './nacht-merger-wahl.mjs'

export const HOECHSTENS_VORGABE = 3
/** Übernahme-Anstöße (Prüfer-Läufe) je Lauf: jeder ist ein Actions-Lauf, nicht mehr als beim Merge */
export const UEBERNAHMEN_JE_LAUF = 3
/** Wartezeit vor der einen Wiederholung, wenn GitHub die Mergebarkeit noch rechnet (UNKNOWN, gemessen 07.11.2026 bei #2994/#3049: wenig später CLEAN). */
export const UNKNOWN_WARTE_MS = Number(process.env.NACHT_MERGER_WARTE_MS) || 20_000 // Umgebungswert nur für den Prozesstest (wie WACHE_LIMIT_MS)
/** Zeitbudget je Lauf: der Job hat 20 min (nacht-merger.yml), je UNKNOWN-PR kommen bis zu 40 s Wartezeit dazu; danach geordnet aufhören. */
export const BUDGET_MS = 15 * 60_000
const NOCH_NICHT_BERECHNET = /noch nicht berechnet/

/** `pr-nachrechnen` mit genau einer Wiederholung, wenn die Mergebarkeit oder der Test-Merge noch nicht berechnet war (Exit 2, nichts angestoßen). */
export function nachrechnenMitWiederholung(welt, nummer) {
  const erst = welt.nachrechnen(nummer)
  if (erst.exit !== 2 || !NOCH_NICHT_BERECHNET.test(erst.text)) return erst
  welt.warte(UNKNOWN_WARTE_MS)
  return welt.nachrechnen(nummer)
}

/** Einzelabfrage des Mergestatus vor dem Merge: null = CLEAN, sonst { grund, unentschieden }; UNKNOWN wird einmal nach Wartezeit wiederholt und ist als einziger Status technisch unentschieden (DIRTY/BLOCKED sind echte Abweisungen). */
export function mergeStatusGrund(welt, nummer) {
  let status = welt.mergeStatus(nummer)
  if (status === 'UNKNOWN') {
    welt.warte(UNKNOWN_WARTE_MS)
    status = welt.mergeStatus(nummer)
  }
  return status === 'CLEAN' ? null : { grund: `Mergestatus in der Einzelabfrage ${status}, nicht CLEAN`, unentschieden: status === 'UNKNOWN' }
}

export const NACHPRUEFUNG_LABEL = 'nachpruefung-offen'

/** Gemergter Stufe-2-PR bekommt das Label (Daniel 27.11.2026: Prüfung nach dem Merge statt Tor davor); scheitert es, steht der Fehler im Protokoll, der Merge gilt. */
export function markiereNachpruefung(welt, nummer) {
  try {
    welt.markiere(nummer, NACHPRUEFUNG_LABEL)
    welt.zeile(`NACHPRÜFUNG OFFEN #${nummer}: Label ${NACHPRUEFUNG_LABEL} gesetzt`)
  } catch (e) {
    welt.zeile(`NACHPRÜFUNG-LABEL FEHLGESCHLAGEN #${nummer}: ${String(e.message).split('\n')[0]}`)
  }
}

/**
 * REVIEW_REQUIRED nach einem Main-Nachzug (Ruleset `dismiss_stale`, Dirigent-Nachtrag 7218441221): Das Prüfer-Ok liegt am Vorgänger-Kopf, die Kette am neuen
 * ist grün. Dann startet der Merger den Prüfer-Lauf (`pr-pruefer.yml`, seine Übernahme schreibt bei gleichem eigenem Diff das Ok neu), sofern nicht schon
 * einer läuft; im nächsten Lauf kommt der PR als Kandidat dran. Rückgabe { fall, angestossen }: `fall` = der PR ist ein solcher Fall (keine ÜBERSPRUNGEN-Zeile).
 */
export function uebernahmeFall(welt, pr, { trocken, frei }) {
  const voll = welt.leicht(pr)
  if (!freigabeVerworfen(voll)) return { fall: false, angestossen: false }
  const wo = `#${pr.nummer} Kopf ${voll.kopf.slice(0, MIN_HASH)}`
  if (welt.pruefungLaeuft(pr.nummer)) {
    welt.zeile(`ÜBERNAHME WARTET ${wo}: Freigabe nach Main-Nachzug verworfen, ein Prüfer-Lauf steht schon in der Warteschlange oder läuft`)
    return { fall: true, angestossen: false }
  }
  if (!frei) {
    welt.zeile(`ÜBERNAHME RIEGEL ${wo}: höchstens ${UEBERNAHMEN_JE_LAUF} Anstöße je Lauf, kommt im nächsten Lauf dran`)
    return { fall: true, angestossen: false }
  }
  if (trocken) {
    welt.zeile(`WÜRDE ÜBERNAHME ANSTOSSEN ${wo}: Freigabe nach Main-Nachzug verworfen (Trockenlauf)`)
    return { fall: true, angestossen: true }
  }
  try {
    welt.uebernahmeAnstossen(pr.nummer, voll.kopf)
    welt.zeile(`ÜBERNAHME ANGESTOSSEN ${wo}: Freigabe nach Main-Nachzug verworfen, Prüfer-Ok am Vorgänger-Kopf`)
    return { fall: true, angestossen: true }
  } catch (e) {
    welt.zeile(`ÜBERNAHME FEHLGESCHLAGEN ${wo}: ${String(e.message).split('\n')[0]}`)
    return { fall: true, angestossen: false }
  }
}

/** Warnzeile (GitHub-Anmerkung), wenn ein Lauf nichts merget, obwohl PRs technisch nicht entschieden werden konnten; sonst null. */
export function stillstandWarnung(gemergt, unentschieden) {
  if (gemergt > 0 || unentschieden.length === 0) return null
  return `::warning::Nacht-Merger: 0 Merges, ${unentschieden.length} PR technisch nicht entschieden (${unentschieden.join(', ')})`
}

/**
 * Ein Lauf. `welt` bringt alle Seiteneffekte mit (im Test eine Attrappe):
 *   offene() -> PRs der Liste; details(pr) -> pr + { kopf, stufe, pfade, checks, kommentare }; kopfVon(n); nachrechnen(n) -> { exit, text };
 *   bauCommittet(); bestandRot(); merge(pr); zeile(text).
 * Rückgabe { gemergt: [Nummern], fehler: Zahl }.
 */
export function lauf(welt, { hoechstens = HOECHSTENS_VORGABE, trocken = false, budgetMs = BUDGET_MS } = {}) {
  const start = welt.jetzt()
  const abgewiesen = (pr, grund) => welt.zeile(`ÜBERSPRUNGEN #${pr.nummer}: ${grund}`)
  const kandidaten = []
  let uebernahmen = 0
  for (const pr of welt.offene()) {
    const vorab = vorabGrund(pr)
    if (vorab !== null) {
      const u = pr.reviewDecision === 'REVIEW_REQUIRED' ? uebernahmeFall(welt, pr, { trocken, frei: uebernahmen < UEBERNAHMEN_JE_LAUF }) : { fall: false }
      if (u.angestossen) uebernahmen += 1
      if (!u.fall) abgewiesen(pr, vorab)
      continue
    }
    const voll = welt.details(pr)
    const urteil = kandidat(voll)
    if (urteil.kandidat) kandidaten.push({ ...voll, grund: urteil.grund })
    else abgewiesen(pr, urteil.grund)
  }
  const gemergt = []
  const unentschieden = []
  let fehler = 0
  for (const pr of reihenfolge(kandidaten, welt.bestandRot())) {
    if (welt.jetzt() - start > budgetMs) {
      unentschieden.push(`#${pr.nummer}`)
      abgewiesen(pr, `Zeitbudget ${Math.round(budgetMs / 60_000)} min erschöpft, kommt im nächsten Lauf dran`)
      continue
    }
    if (gemergt.length >= hoechstens) {
      abgewiesen(pr, `Riegel: höchstens ${hoechstens} Merges je Lauf, kommt im nächsten Lauf dran`)
      continue
    }
    const kopf = welt.kopfVon(pr.nummer)
    if (kopf !== pr.kopf) {
      abgewiesen(pr, `Kopf hat sich geändert (${pr.kopf.slice(0, 9)} -> ${kopf.slice(0, 9)}), nächster Lauf`)
      continue
    }
    const r = nachrechnenMitWiederholung(welt, pr.nummer)
    if (r.exit !== 0) {
      if (r.exit === 2 && NOCH_NICHT_BERECHNET.test(r.text)) unentschieden.push(`#${pr.nummer}`)
      abgewiesen(pr, `nicht als mergebar bestätigt (nachrechnen Exit ${r.exit}): ${r.text}`)
      continue
    }
    const statusGrund = mergeStatusGrund(welt, pr.nummer)
    if (statusGrund !== null) {
      if (statusGrund.unentschieden) unentschieden.push(`#${pr.nummer}`)
      abgewiesen(pr, statusGrund.grund)
      continue
    }
    if (welt.bauCommittet()) {
      abgewiesen(pr, 'Bestandsbau committet gerade, ein Merge erzwänge einen zweiten Bau')
      continue
    }
    if (trocken) {
      gemergt.push(pr.nummer)
      welt.zeile(`WÜRDE MERGEN #${pr.nummer}: ${pr.grund} (Trockenlauf)`)
      continue
    }
    try {
      welt.merge(pr)
    } catch (e) {
      fehler += 1
      welt.zeile(`MERGE FEHLGESCHLAGEN #${pr.nummer}: ${String(e.message).split('\n')[0]}`)
      break
    }
    gemergt.push(pr.nummer)
    welt.zeile(`GEMERGT #${pr.nummer}: ${pr.grund}`)
    if (pr.stufe === 2) markiereNachpruefung(welt, pr.nummer)
  }
  welt.zeile(`Nacht-Merger: ${gemergt.length} ${trocken ? 'wären gemergt' : 'gemergt'}, ${fehler} Fehler, ${kandidaten.length} Kandidaten`)
  const warnung = stillstandWarnung(gemergt.length, unentschieden)
  if (warnung !== null) welt.zeile(warnung)
  return { gemergt, fehler, stillstand: warnung !== null }
}

/** Exit 1 bei einem fehlgeschlagenen Merge oder bei Stillstand (0 Merges, PR technisch unentschieden): der rote Lauf fällt der Wache auf. */
export const exitCode = (ergebnis) => (ergebnis.fehler > 0 || ergebnis.stillstand ? 1 : 0)

/** Argumente: `--trocken`, `--hoechstens N`; sonst null (Aufruffehler). */
export function argumente(argv) {
  const opt = { trocken: false, hoechstens: HOECHSTENS_VORGABE }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--trocken') opt.trocken = true
    else if (argv[i] === '--hoechstens' && /^[1-9]\d?$/.test(argv[i + 1] ?? '')) opt.hoechstens = Number(argv[++i])
    else return null
  }
  return opt
}

/** Startlogik: Argumente lesen, `weltHole()` erst bei gültigen Argumenten rufen, Lauf mit den Optionen; Rückgabe ist der Prozess-Exit (2 = Aufruffehler). */
export function starte(argv, weltHole) {
  const opt = argumente(argv)
  if (opt === null) {
    console.error('Aufruf: node tools/nacht-merger.mjs [--trocken] [--hoechstens N]')
    return 2
  }
  return exitCode(lauf(weltHole(), opt))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { echteWelt } = await import('./nacht-merger-welt.mjs')
  process.exit(starte(process.argv.slice(2), echteWelt))
}
