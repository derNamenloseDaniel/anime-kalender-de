/**
 * Wächter (26.11.2026, Fall MOTN-Runde `13-3-1`): Jede Stelle im Bau, die einem Titel Wege (`streams`, `watchLinks`) anlegt, ist einzeln
 * angesehen und steht in `lib/wege-stellen-geprueft.json`, mit der Tot-Frage, die sie benutzt (`istTot`, `toteAdressen`, `lautPruefungTot`), oder
 * mit Grund, warum nicht. Gefunden wird per Syntaxbaum (`lib/wege-stellen.ts`). Rot, wenn
 *  - eine neue Stelle (Datei::Funktion) fehlt oder mehr Stellen als eingetragen hat,
 *  - eine eingetragene Stelle ihre Tot-Frage nicht mehr benutzt (entfernter `istTot`-Aufruf),
 *  - ein Eintrag keine Stelle mehr hat oder ein „ohne“ ohne Grund steht.
 * Ergebnisseitig prüft `check-tote-adressen.ts` den ausgelieferten Datensatz.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-wege-stellen-istot.ts`
 */
import { readFileSync } from 'node:fs'
import { alleWegeStellen, findeWegeStellen, TOT_FRAGEN, zusammenfassen } from './lib/wege-stellen.ts'

interface Eintrag {
  anzahl: number
  pruefung: string
  grund?: string
}
type Liste = Record<string, Eintrag | string>

/** Alle Abweichungen zwischen Fund und Liste; leer = in Ordnung. */
export function vergleicheMitListe(funde: ReturnType<typeof zusammenfassen>, liste: Liste): string[] {
  const fehler: string[] = []
  for (const [schluessel, f] of funde) {
    const e = liste[schluessel]
    if (!e || typeof e === 'string') {
      fehler.push(`neue ungeprüfte Stelle: ${schluessel} (Zeile ${f.zeilen.join(', ')}) — ansehen, istTot/lautPruefungTot einbauen oder mit Grund eintragen`)
      continue
    }
    if (f.anzahl > e.anzahl) fehler.push(`${schluessel}: ${f.anzahl} Stellen, geprüft sind ${e.anzahl} (Zeile ${f.zeilen.join(', ')})`)
    if (f.anzahl < e.anzahl) fehler.push(`${schluessel}: nur noch ${f.anzahl} Stellen, eingetragen ${e.anzahl} — Liste anpassen`)
    if (e.pruefung === 'ohne') {
      if (!e.grund?.trim()) fehler.push(`${schluessel}: „ohne“ braucht einen Grund`)
    } else if (!(TOT_FRAGEN as readonly string[]).includes(e.pruefung)) {
      fehler.push(`${schluessel}: unbekannte pruefung „${e.pruefung}“`)
    } else if (!f.fragen.includes(e.pruefung)) {
      fehler.push(`${schluessel}: benutzt ${e.pruefung} nicht mehr (Zeile ${f.zeilen.join(', ')}) — Wege dürfen nicht ohne Tot-Frage angelegt werden`)
    }
  }
  for (const k of Object.keys(liste)) if (!k.startsWith('_') && !funde.has(k)) fehler.push(`veralteter Eintrag ohne Stelle: ${k}`)
  return fehler
}

/** Rückgabe für Tests: Fehlerliste zu einem Quelltext und einer Liste. */
export function pruefeQuelltext(datei: string, text: string, liste: Liste): string[] {
  const eigene = Object.fromEntries(Object.entries(liste).filter(([k]) => k.startsWith(`${datei}::`)))
  return vergleicheMitListe(zusammenfassen(findeWegeStellen(datei, text)), eigene)
}

/** Der Wächter selbst: eine echte Stelle ohne ihren `istTot`-Aufruf und ein fremder Neuzugang müssen rot werden. */
function eigeneFaelle(liste: Liste): string[] {
  const fehler: string[] = []
  const erwarte = (name: string, got: string[], muster: RegExp | null) => {
    if (muster ? !got.some((g) => muster.test(g)) : got.length) fehler.push(`Wächter-Selbsttest „${name}“: ${JSON.stringify(got)}`)
  }
  const datei = 'pipeline/bau/13-3-1-tmdb-wege.ts'
  const echt = readFileSync(datei, 'utf8')
  erwarte('echte Datei unverändert grün', pruefeQuelltext(datei, echt, liste), null)
  const ohneAufruf = echt.replace('if (istTot(url)) continue', '')
  erwarte('istTot-Aufruf entfernt', ohneAufruf === echt ? ['Ersatz griff nicht'] : pruefeQuelltext(datei, ohneAufruf, liste), /benutzt istTot nicht mehr/)
  const neu = 'export function neueRunde(t: { streams: unknown[] }, u: string) { t.streams.push({ url: u }) }'
  erwarte('neue Funktion mit streams.push', pruefeQuelltext('pipeline/bau/neu.ts', neu, {}), /neue ungeprüfte Stelle/)
  const zweite = 'export function a(t: { watchLinks?: unknown[] }) { t.watchLinks = [{ url: "x" }] }'
  erwarte('Zuweisung an watchLinks', pruefeQuelltext('pipeline/bau/neu.ts', zweite, {}), /neue ungeprüfte Stelle/)
  const nurFilter = 'export function f(t: { streams: { u: string }[] }) { t.streams = t.streams.filter((s) => s.u) }'
  erwarte('nur Wegnehmen ist keine Stelle', pruefeQuelltext('pipeline/bau/neu.ts', nurFilter, {}), null)
  return fehler
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const liste = JSON.parse(readFileSync('pipeline/lib/wege-stellen-geprueft.json', 'utf8')) as Liste
  const fehler = [...vergleicheMitListe(zusammenfassen(alleWegeStellen(process.cwd())), liste), ...eigeneFaelle(liste)]
  if (fehler.length) {
    for (const f of fehler) console.error(`  ✖ ${f}`)
    process.exit(1)
  }
  console.log(`  ✓ ${Object.keys(liste).filter((k) => !k.startsWith('_')).length} Stellen, die Wege anlegen, geprüft`)
}
