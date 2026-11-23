/**
 * Wächter: ein Schritt mit `continue-on-error` muss seinen Fehler melden, sonst geht das Rot still unter (Nachzug PR 4005:
 * dort blieb `verwaisteTermine: 38` rund zwei Wochen unbemerkt). Als Meldung gilt im `run`-Text (ohne Kommentarzeilen):
 * `DATEN_WARNUNG` (gelbe Lauf-Meldung), eine `FEHLER:`-Zeile (liest `tools/wache-weicher-schritt.mjs` aus dem Log),
 * der Lauf-Melder (`$MELDER`, `lauf-melden.sh`, `lauf-abmelden.sh`) oder `schritte-auswerten.sh` (gibt die Fehlschläge weiter).
 * Alle anderen Schritte (auch `uses:`-Schritte ohne `run`) stehen mit Grund in `AUSNAHMEN`; eine Ausnahme ohne Treffer
 * oder zu einem Schritt, der inzwischen meldet, ist ebenfalls ein Fehler. Prüfschritte (Nr. 43) prüft `coe-pruefschritt-wache.mjs`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { geduldet } from './coe-pruefschritt-wache.mjs'

const MELDUNG = /DATEN_WARNUNG|^\s*(?:echo\s+)?["']?FEHLER:|\$MELDER\b|\$\{MELDER\}|lauf-melden\.sh|lauf-abmelden\.sh|schritte-auswerten\.sh/m

const G_ANMELDEN = 'Lauf-Telemetrie: Anmelden an die Statusanzeige ist selbst die Meldung; scheitert es, läuft der Workflow ohne Anzeige weiter.'
const G_ARTEFAKT = 'Artefakt-Transport (hoch-/herunterladen): ohne Artefakt entfällt nur eine Zusatzhilfe, der Fehler steht im Schrittprotokoll.'
const G_ZUGANG = 'Zugangspaket über die Weiche: fehlt es, fällt der nachfolgende Abruf auf den Ausweichweg bzw. meldet selbst.'
const G_KOMMENTAR = 'Kommentar am Pull Request: reine Zusatzinformation, ein Fehlschlag verändert keine Daten.'

// Je Eintrag: Datei, Schritt-Name wörtlich wie im Workflow, Grund. Eine Ausnahme gilt für alle gleichnamigen Schritte der Datei.
export const AUSNAHMEN = [
  { datei: 'bestand-bauen.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'claude-auftrag.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'claude-auftrag.yml', schritt: 'Fortschritt im Hintergrund melden', grund: G_ANMELDEN },
  { datei: 'claude-daten-merge.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'claude-reparatur.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'crunchyroll-nachholen.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'deploy.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'refresh-data.yml', schritt: 'Lauf anmelden', grund: G_ANMELDEN },
  { datei: 'refresh-hourly.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'refresh-weekly.yml', schritt: 'Lauf anmelden', grund: G_ANMELDEN },
  { datei: 'tonspuren-monatlich.yml', schritt: 'Sofort anmelden', grund: G_ANMELDEN },
  { datei: 'bestand-bauen.yml', schritt: 'Vorfaelle aus der Erweiterung abholen', grund: 'Zusatzabruf vor dem Bau; ohne ihn baut der Bau mit dem letzten Stand.' },
  { datei: 'bestand-bauen.yml', schritt: 'Rohfolgen zuordnen', grund: 'Der Bau-Folgeschritt „Datensatz bauen“ liest dieselben Eingaben und scheitert selbst, wenn sie fehlen.' },
  { datei: 'bestand-bauen.yml', schritt: 'Folgen je Plattform-Folge zuordnen', grund: 'Wie Rohfolgen zuordnen: der Datensatzbau und `check:bestand` sehen fehlende Zuordnung.' },
  { datei: 'bestand-bauen.yml', schritt: 'Urteile je Folge berechnen', grund: 'Wie Rohfolgen zuordnen: der Datensatzbau und `check:bestand` sehen fehlende Urteile.' },
  { datei: 'bestand-bauen.yml', schritt: 'Delta am Bestand festhalten', grund: 'Reine Historie; `delta-wache.yml` meldet ein fehlendes Delta am nächsten Morgen.' },
  { datei: 'bestand-bauen.yml', schritt: 'Behobene Rot-Issues schließen', grund: 'Aufräumen von Issues; bleibt ein Issue offen, schließt es der nächste Bau.' },
  { datei: 'bestand-bauen.yml', schritt: 'Eingaben des roten Baus als Artefakt sichern', grund: G_ARTEFAKT },
  { datei: 'bestand-bauen.yml', schritt: 'Sammler-Stand seit dem letzten grünen Bau zurücknehmen', grund: 'Läuft nur im roten Bau als Aufräumhilfe; der rote Bau ist selbst gemeldet.' },
  { datei: 'claude-anime2you-extraktion.yml', schritt: 'Artikel-Router', grund: 'Vorsortierung für den Agenten; ohne sie liest der Agent alle Artikel selbst.' },
  { datei: 'claude-anime2you-extraktion.yml', schritt: 'Schattenlauf der Regel', grund: 'Nur Vergleichsmessung für den Pull Request, ändert keine Daten.' },
  { datei: 'claude-anime2you-extraktion.yml', schritt: 'Zusammenfassung an den Pull Request hängen', grund: G_KOMMENTAR },
  { datei: 'claude-anime2you-extraktion.yml', schritt: 'Belege an den Pull Request hängen', grund: G_KOMMENTAR },
  { datei: 'claude-auftrag.yml', schritt: 'Crunchyroll-Zugangspaket über die Weiche holen', grund: G_ZUGANG },
  { datei: 'claude-daten-merge.yml', schritt: 'Ablauf von Claude zeigen', grund: 'Anzeige des Agentenlaufs in der Schrittzusammenfassung, keine Datenwirkung.' },
  { datei: 'claude-reparatur.yml', schritt: 'Gleiche Ursache schon bekannt?', grund: 'Vorabprüfung; ohne sie untersucht der Agent den Fehler in jedem Fall.' },
  { datei: 'claude-reparatur.yml', schritt: 'Eingaben des roten Baus laden', grund: G_ARTEFAKT },
  { datei: 'claude-wache-urteil.yml', schritt: 'Zusammenfassung an den Pull Request hängen', grund: G_KOMMENTAR },
  { datei: 'crunchyroll-nachholen.yml', schritt: 'Crunchyroll-Zugangspaket über die Weiche holen', grund: G_ZUGANG },
  { datei: 'daten-auf-abruf.yml', schritt: 'Crunchyroll-Zugangspaket über die Weiche holen', grund: G_ZUGANG },
  { datei: 'd1-verbrauch.yml', schritt: 'Verbrauch prüfen', grund: 'Der Folgeschritt wertet `verbrauch.txt` aus und meldet; der Schritt schreibt nur die Datei (Tee).' },
  { datei: 'd1-verbrauch.yml', schritt: 'Kapazität messen', grund: 'Wie „Verbrauch prüfen“: die Auswertung der Textdatei folgt im selben Job.' },
  { datei: 'deploy.yml', schritt: 'Artefakt für die Veröffentlichung hochladen', grund: 'Scheitert der Upload, fehlt dem Deploy-Job das Artefakt und er wird selbst rot.' },
  { datei: 'deploy.yml', schritt: 'Überholte rote Läufe abnehmen', grund: 'Aufräumhilfe nach dem Deploy; `laeufe-aufraeumen` läuft an jeder Wachphase erneut.' },
  { datei: 'deploy.yml', schritt: './.github/actions/kette-einrichten', grund: 'Einrichtung für die nachfolgende Live-Messung; scheitert sie, scheitert die Messung selbst sichtbar.' },
  { datei: 'deploy.yml', schritt: 'Kachelränder live messen', grund: 'Messung nach dem Deploy; der Aussehen-Job der Kette misst dieselben Ränder vor dem Merge.' },
  { datei: 'mutationsprobe.yml', schritt: 'Ergebnis holen', grund: G_ARTEFAKT },
  { datei: 'pr-pruefer.yml', schritt: 'Mutationsprobe einlesen', grund: G_ARTEFAKT },
  { datei: 'pr-pruefer.yml', schritt: 'Prüfer (Stufe 0, schlank)', grund: 'Der Prüfer-Lauf gibt sein Urteil als Kommentar ab; ein Ausfall zeigt sich als fehlender Kommentar und wird per Dispatch neu gestartet.' },
  { datei: 'pr-pruefer.yml', schritt: 'Prüfer', grund: 'Wie Prüfer (Stufe 0): Ausfall zeigt sich als fehlender Kommentar.' },
  { datei: 'pr-pruefer.yml', schritt: 'Prüfer (Abnahme)', grund: 'Wie Prüfer (Stufe 0): Ausfall zeigt sich als fehlender Kommentar.' },
  { datei: 'tonspuren-monatlich.yml', schritt: 'Messung gegen die eigenen Belege', grund: 'Schreibt in die Schrittzusammenfassung; das Einreichen danach läuft mit `if: always()`.' },
  { datei: 'tonspuren-monatlich.yml', schritt: 'Tonspur-Verdacht ableiten', grund: 'Zusatzliste für Daniel; ohne sie bleibt die alte Liste stehen.' },
  { datei: 'delta-wache.yml', schritt: 'Delta der letzten 24 Stunden', grund: 'Der Wächter schreibt in die Textdatei, der Schritt am Ende des Jobs entscheidet über Rot.' },
  { datei: 'delta-wache.yml', schritt: 'Briefkasten — kommt Daniels Arbeit an?', grund: 'Wie das Delta: der Schritt am Ende entscheidet über Rot.' },
  { datei: 'delta-wache.yml', schritt: 'Zugänge und Kontingent', grund: 'Wie das Delta: der Schritt am Ende entscheidet über Rot.' },
  { datei: 'wecker-wache.yml', schritt: 'Wachphase (nur lesend)', grund: 'Exit-Code wird in `code` gemerkt und im Folgeschritt ausgewertet.' },
]

/** Zeilen ohne Kommentare. */
const ohneKommentare = (text) =>
  String(text ?? '')
    .split('\n')
    .filter((z) => !z.trim().startsWith('#'))
    .join('\n')

/** Meldet der Schritt seinen Fehler (Lauf-Melder, `DATEN_WARNUNG`, `FEHLER:`-Zeile, Fehlschlag-Auswertung)? */
export function meldetFehler(schritt) {
  return MELDUNG.test(ohneKommentare(schritt?.run))
}

/** Alle geduldeten Schritte ohne Meldung eines geparsten Workflows: `{ job, schritt }`. */
export function findeStille(doc) {
  const funde = []
  for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
    for (const s of job?.steps ?? []) {
      if (geduldet(s?.['continue-on-error']) && !meldetFehler(s)) funde.push({ job: jobId, schritt: String(s.name ?? s.uses ?? s.run) })
    }
  }
  return funde
}

/** Fehlermeldungen für alle Workflows unter `wurzel/.github/workflows` (leer = grün), Trefferzahl und Zahl geduldeter Schritte. */
export function pruefeMeldung(wurzel, ausnahmen = AUSNAHMEN) {
  const dir = resolve(wurzel, '.github/workflows')
  const meldungen = []
  const benutzt = new Set()
  let treffer = 0
  let geduldetGesamt = 0
  for (const datei of readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))) {
    let doc
    try {
      doc = parse(readFileSync(resolve(dir, datei), 'utf8'))
    } catch {
      continue // ungültiges YAML meldet der Hauptlauf schon
    }
    for (const job of Object.values(doc?.jobs ?? {})) {
      for (const s of job?.steps ?? []) if (geduldet(s?.['continue-on-error'])) geduldetGesamt++
    }
    for (const fund of findeStille(doc)) {
      treffer++
      const i = ausnahmen.findIndex((a) => a.datei === datei && a.schritt === fund.schritt)
      if (i >= 0) {
        benutzt.add(i)
        continue
      }
      meldungen.push(
        `✗ ${datei}: Schritt „${fund.schritt}" (Job "${fund.job}") trägt \`continue-on-error\` ohne Meldung (kein DATEN_WARNUNG, keine FEHLER:-Zeile, kein Lauf-Melder) — ein Rot ginge still unter. ` +
          'Melden (`DATEN_WARNUNG` per `$GITHUB_ENV`) oder mit Grund in `AUSNAHMEN` (tools/coe-meldung-wache.mjs) eintragen.',
      )
    }
  }
  ausnahmen.forEach((a, i) => {
    if (benutzt.has(i)) return
    meldungen.push(`✗ coe-meldung: Ausnahme „${a.schritt}" (${a.datei}) hat keinen Treffer mehr — aus \`AUSNAHMEN\` streichen.`)
  })
  return { meldungen, treffer, geduldet: geduldetGesamt }
}
