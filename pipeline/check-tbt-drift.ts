/**
 * Zusicherungen zu `lib/tbt-drift.ts` (26.11.2026): Der Wochenmedian je Seite und Runner-Band meldet eine langsame TBT-Drift
 * (+10 % Warnung, +15 % Fehler, mindestens 20 ms und 20 Läufe je Woche), eine Seite im Rauschen bleibt grün, zu wenige Läufe sind ein
 * eigener Befund. Läuft in `check:logic`. Mit einer Tabelle als Argument wertet es echte Läufe aus:
 * `npx tsx pipeline/check-tbt-drift.ts docs/wissen/lighthouse-laeufe-<datum>.tsv [jetzt-ISO]` (Exit 1 bei Fehler).
 */
import { readFileSync } from 'node:fs'
import { bandVon, FEHLER_ANTEIL, leseLaeufe, pruefeDrift, type Lauf } from './lib/tbt-drift.ts'

const TAG = 86_400_000
const JETZT = Date.parse('2026-11-30T12:00:00Z')

let fehler = 0
function pruefe(text: string, ist: unknown, soll: unknown) {
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++
    console.error(`FEHLER ${text}:\n  ist  ${JSON.stringify(ist)}\n  soll ${JSON.stringify(soll)}`)
  }
}

/** `n` Läufe je Woche (Tag −13 … −1 vor JETZT), Seite „Titel“ mit `alt` ms in der ersten, `neu` in der zweiten Woche. */
function wochen(benchmark: number, alt: number, neu: number, n = 24): Lauf[] {
  return Array.from({ length: 2 * n }, (_, i) => {
    const zweite = i >= n
    const tage = zweite ? 6.5 - ((i - n) * 6) / n : 13.5 - (i * 6) / n
    return { zeit: JETZT - tage * TAG, benchmark, tbt: { Titel: zweite ? neu : alt } }
  })
}
const stufe = (l: Lauf[]) => pruefeDrift(l, JETZT).find((b) => b.band === bandVon(l[0].benchmark))?.stufe

pruefe('Bänder wie lighthouse-urteil', [bandVon(3250), bandVon(3249), bandVon(2750), bandVon(2749)], ['schnell', 'mittel', 'mittel', 'langsam'])
pruefe('Rauschen +5 % bleibt ok', stufe(wochen(2500, 1000, 1050)), 'ok')
pruefe('+10 % ist Warnung', stufe(wochen(2500, 1000, 1100)), 'warnung')
pruefe('+14 % ist noch Warnung', stufe(wochen(2500, 1000, 1140)), 'warnung')
pruefe('+15 % ist Fehler', stufe(wochen(2500, 1000, 1150)), 'fehler')
pruefe('Besserung ist ok', stufe(wochen(2500, 1000, 700)), 'ok')
pruefe('+25 % unter 20 ms ist Rauschen (schnelle Seite)', stufe(wochen(3500, 60, 74)), 'ok')
pruefe('+25 % ab 20 ms zählt', stufe(wochen(3500, 80, 100)), 'fehler')
pruefe('zu wenige Läufe (19) sind ein eigener Befund', stufe(wochen(2500, 1000, 2000, 19)), 'zu-wenig')
pruefe('genau 20 Läufe zählen', stufe(wochen(2500, 1000, 2000, 20)), 'fehler')

// Bänder werden getrennt: Drift im Band „langsam“ wird nicht durch schnelle Runner im selben Fenster verdünnt.
const gemischt = [...wochen(2500, 1000, 1300), ...wochen(3500, 300, 300)]
const je = Object.fromEntries(pruefeDrift(gemischt, JETZT).map((b) => [b.band, b.stufe]))
pruefe('Bänder getrennt', je, { langsam: 'fehler', schnell: 'ok' })
pruefe('Fehlergrenze als Anteil', FEHLER_ANTEIL, 0.15)

/** Läufe mit den Werten `tbt` (Seite „Titel“, Band langsam), gleichmäßig über die Woche, die `tageVor` Tage vor JETZT beginnt. */
const woche = (tbt: number[], tageVor: number): Lauf[] => tbt.map((x, i) => ({ zeit: JETZT - (tageVor + (i * 6) / tbt.length) * TAG - 0.1 * TAG, benchmark: 2500, tbt: { Titel: x } }))
const befund = (l: Lauf[]) => pruefeDrift(l, JETZT)[0]
const gleich = (n: number, x: number) => Array<number>(n).fill(x)

// Median: numerisch (nicht als Text: 100 < 20), ungerade und gerade Zahl.
const gemischtWerte = [...gleich(12, 9), ...gleich(8, 10), ...gleich(5, 100)]
pruefe('Median ungerade, numerisch sortiert', [befund([...woche(gemischtWerte, 7), ...woche(gemischtWerte, 0)]).vorher, befund([...woche(gemischtWerte, 7), ...woche(gemischtWerte, 0)]).jetzt], [10, 10])
const gerade = [...gleich(12, 10), ...gleich(12, 20)]
pruefe('Median gerade: Mittel der beiden mittleren', befund([...woche(gerade, 7), ...woche(gerade, 0)]).vorher, 15)

// Das komplette Befund-Objekt, beide Formen.
pruefe('Befund Drift', befund([...woche(gleich(20, 1000), 7), ...woche(gleich(20, 1200), 0)]), { seite: 'Titel', band: 'langsam', vorher: 1000, jetzt: 1200, anteil: 0.2, stufe: 'fehler', n: [20, 20] })
pruefe('Befund zu wenig', befund([...woche(gleich(5, 1000), 7), ...woche(gleich(20, 1200), 0)]), { seite: 'Titel', band: 'langsam', vorher: 0, jetzt: 0, anteil: 0, stufe: 'zu-wenig', n: [5, 20] })

// Fenstergrenzen: ein Lauf genau bei JETZT zählt zur neuen, genau bei JETZT − 7 Tage zur alten, bei JETZT − 14 Tage zu keiner Woche.
const lauf = (zeit: number, x = 1000): Lauf => ({ zeit, benchmark: 2500, tbt: { Titel: x } })
const neun = (tageVor: number) => woche(gleich(19, 1000), tageVor)
pruefe('Lauf bei JETZT zählt zur neuen Woche', befund([...woche(gleich(20, 1000), 7), ...neun(0), lauf(JETZT)]).n, [20, 20])
pruefe('Lauf bei JETZT − 7 Tage zählt zur alten Woche', befund([...neun(7), lauf(JETZT - 7 * TAG), ...woche(gleich(20, 1000), 0)]).n, [20, 20])
pruefe('Lauf bei JETZT − 7 Tage zählt nicht zur neuen', befund([...woche(gleich(20, 1000), 7), ...neun(0), lauf(JETZT - 7 * TAG)]).n, [21, 19])
pruefe('Lauf bei JETZT − 14 Tage zählt zu keiner Woche', befund([...neun(7), lauf(JETZT - 14 * TAG), ...woche(gleich(20, 1000), 0)]).n, [19, 20])

// Messwerte: 0 ms ist ein Messwert, ein fehlender (NaN) nicht.
pruefe('0 ms zählt', befund([...woche(gleich(19, 1000), 7), lauf(JETZT - 10 * TAG, 0), ...woche(gleich(20, 1000), 0)]).n, [20, 20])
pruefe('NaN zählt nicht', befund([...woche(gleich(20, 1000), 7), ...woche(gleich(5, NaN), 7), ...woche(gleich(20, 1000), 0)]).n, [20, 20])

// Die echte Tabelle vom 21.11.2026 (68 Läufe, nur zwei Tage): lesbar und ehrlich „zu wenig“, nie grün.
const tabelle = readFileSync('docs/wissen/lighthouse-laeufe-2026-11-21.tsv', 'utf8')
const echt = leseLaeufe(tabelle)
pruefe('Tabelle: 68 Läufe, drei Seiten', [echt.length, Object.keys(echt[0].tbt)], [68, ['Kalender', 'Datenbank', 'Titel']])
pruefe('Tabelle: erste Zeile', echt[0], { zeit: Date.parse('2026-11-20T12:08:00Z'), benchmark: 4286, tbt: { Kalender: 38, Datenbank: 215, Titel: 280 } })
pruefe('Tabelle: zwei Tage reichen nicht', [...new Set(pruefeDrift(echt, Date.parse('2026-11-21T15:00:00Z')).map((b) => b.stufe))], ['zu-wenig'])

const datei = process.argv[2]
if (datei) {
  const jetzt = process.argv[3] ? Date.parse(process.argv[3]) : Date.now()
  for (const b of pruefeDrift(leseLaeufe(readFileSync(datei, 'utf8')), jetzt)) {
    const zahl = b.stufe === 'zu-wenig' ? `Läufe ${b.n[0]}/${b.n[1]}` : `${b.vorher} → ${b.jetzt} ms (${(b.anteil * 100).toFixed(1)} %)`
    console.log(`${b.stufe.toUpperCase().padEnd(8)} ${b.seite} / ${b.band}: ${zahl}`)
    if (b.stufe === 'fehler') fehler++
  }
}

if (fehler) process.exit(1)
console.log('check-tbt-drift: ok')
