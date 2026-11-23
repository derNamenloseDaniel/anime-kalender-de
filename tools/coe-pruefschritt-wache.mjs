/**
 * Wächter gegen `continue-on-error` an Prüfschritten und Prüf-Jobs in `.github/workflows`.
 *
 * Warum: Ein Prüfschritt, der scheitern darf, macht den Lauf grün, obwohl die Prüfung rot war (Prüfer PR 4178).
 * Ein Schritt gilt als Prüfschritt, wenn sein `run` (ohne Kommentarzeilen) eine Prüfung aufruft: `npm run`
 * auf ein Skript mit Segment `check`/`validate` (`check:x`, `data:x:check`, `data:validate`), ein Werkzeug unter
 * `tools/` mit `check-`, `pruefen`, `wache` oder `waechter` im Namen (`pipeline/` nur mit `check-`), eine `*.test.*`-Datei,
 * `node --test` oder `tsc`. Ein Job ist Prüf-Job, wenn er einen solchen Schritt enthält; sein eigenes
 * `continue-on-error` (alles außer `false`) ist immer ein Fehler.
 *
 * Gewollte Fälle stehen mit Begründung in `AUSNAHMEN` (nur Schritte, nie Jobs). Eine Ausnahme ohne Treffer
 * ist ebenfalls ein Fehler, damit die Liste nicht verwaist. Nicht Teil dieses Wächters: ob ein geduldeter
 * Schritt `DATEN_WARNUNG` setzt (eigener Punkt).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

// Je Eintrag: Datei, Schritt-Name wörtlich wie im Workflow, Grund aus dem Workflow-Kommentar.
export const AUSNAHMEN = [
  {
    datei: 'bestand-bauen.yml',
    schritt: 'Datenqualität messen',
    grund:
      'Rückgang der Titel mit Streaming-Weg wird die gelbe Lauf-Meldung (DATEN_WARNUNG); der Exit-Code der Messung bleibt erhalten, der Bau soll deshalb nicht rot werden (Kommentar vor dem Schritt).',
  },
  {
    datei: 'bestand-bauen.yml',
    schritt: 'Crunchyroll-Folgen im Kalender prüfen',
    grund:
      'Fehlt eine deutsche Crunchyroll-Folge der letzten 14 Tage, bleibt der Bau grün und die Daten gehen raus; der Befund kommt als gelbe Lauf-Meldung (Kommentar vor dem Schritt, Anlass 25.10.2026).',
  },
  {
    datei: 'tonspuren-monatlich.yml',
    schritt: 'Messung gegen die eigenen Belege',
    grund:
      'Workflow nennt keinen eigenen Grund; die Messung schreibt nur in die Schrittzusammenfassung, das Einreichen der Quellen danach läuft mit `if: always()` und soll ihr Rot nicht abwarten müssen.',
  },
  {
    datei: 'delta-wache.yml',
    schritt: 'Delta der letzten 24 Stunden',
    grund: 'Die zweite Prüfung soll auch nach einem Befund laufen; über Rot entscheidet der Schritt am Ende (Kommentar vor dem Schritt).',
  },
  {
    datei: 'delta-wache.yml',
    schritt: 'Briefkasten — kommt Daniels Arbeit an?',
    grund: 'Wie das Delta: Zwei Auffälligkeiten am selben Morgen dürfen sich nicht verdecken; über Rot entscheidet der Schritt am Ende.',
  },
  {
    datei: 'delta-wache.yml',
    schritt: 'Zugänge und Kontingent',
    grund: 'Wie das Delta: läuft auch nach einem Befund der Vorgänger, über Rot entscheidet der Schritt am Ende.',
  },
]

const MUSTER = [
  /npm run (?:[\w-]+:)*(?:check|validate)(?::[\w-]+)*(?![\w-])/,
  /tools\/[\w./-]*(?:check-|pruefen|waechter|wache)[\w.-]*\.(?:mjs|cjs|ts)/,
  /pipeline\/[\w./-]*check-[\w.-]*\.ts/,
  /\.test\.(?:mjs|cjs|ts)(?![\w-])/,
  /node --test(?![\w-])/,
  /\btsc\b/,
]

const ohneKommentare = (text) =>
  String(text ?? '')
    .split('\n')
    .filter((z) => !z.trim().startsWith('#'))
    .join('\n')

/** Ruft der `run`-Text eine Prüfung auf? */
export function istPruefschritt(run) {
  const text = ohneKommentare(run)
  return MUSTER.some((m) => m.test(text))
}

/** `continue-on-error` gilt, sobald es nicht ausdrücklich `false` ist (auch als Ausdruck). */
const geduldet = (wert) => wert !== undefined && wert !== false && String(wert).trim() !== 'false'

/** Alle Funde eines geparsten Workflows: `{ art: 'schritt'|'job', job, schritt }`. */
export function findeFunde(doc) {
  const funde = []
  for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
    const schritte = job?.steps ?? []
    const pruef = schritte.filter((s) => istPruefschritt(s?.run))
    if (pruef.length > 0 && geduldet(job['continue-on-error'])) funde.push({ art: 'job', job: jobId, schritt: null })
    for (const s of pruef) {
      if (geduldet(s['continue-on-error'])) funde.push({ art: 'schritt', job: jobId, schritt: String(s.name ?? s.run) })
    }
  }
  return funde
}

/** Fehlermeldungen für alle Workflows unter `wurzel/.github/workflows` (leer = grün) und die Trefferzahl. */
export function pruefeContinueOnError(wurzel, ausnahmen = AUSNAHMEN) {
  const dir = resolve(wurzel, '.github/workflows')
  const meldungen = []
  const benutzt = new Set()
  let treffer = 0
  for (const datei of readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))) {
    let doc
    try {
      doc = parse(readFileSync(resolve(dir, datei), 'utf8'))
    } catch {
      continue // ungültiges YAML meldet der Hauptlauf schon
    }
    for (const fund of findeFunde(doc)) {
      treffer++
      const i = fund.art === 'schritt' ? ausnahmen.findIndex((a) => a.datei === datei && a.schritt === fund.schritt) : -1
      if (i >= 0) {
        benutzt.add(i)
        continue
      }
      meldungen.push(
        fund.art === 'job'
          ? `✗ ${datei}: Job "${fund.job}" enthält Prüfschritte und trägt \`continue-on-error\` — ein roter Befund machte den Lauf trotzdem grün.`
          : `✗ ${datei}: Prüfschritt „${fund.schritt}" (Job "${fund.job}") trägt \`continue-on-error\` — ein roter Befund machte den Lauf trotzdem grün. ` +
              'Entweder entfernen oder mit Grund in `AUSNAHMEN` (tools/coe-pruefschritt-wache.mjs) eintragen.',
      )
    }
  }
  ausnahmen.forEach((a, i) => {
    if (benutzt.has(i)) return
    meldungen.push(`✗ coe-pruefschritt: Ausnahme „${a.schritt}" (${a.datei}) hat keinen Treffer mehr — aus \`AUSNAHMEN\` streichen.`)
  })
  return { meldungen, treffer }
}
