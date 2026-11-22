/**
 * Zusicherung: `stillstandZeilen` meldet auto-Arten ohne Abbau und gestiegene auto-Arten (Auftrag auto-arten-2111, 21.11.2026).
 * Läuft in `check:logic`; der echte Verlauf steht eingefroren als Ausschnitt hier, die Datei rollt nach 370 Tagen aus.
 */
import { MAENGEL_STILLSTAND_ARTEN, MAENGEL_STILLSTAND_ZEILE, stillstandMessen, stillstandZeilen, type Tagesstand } from './lib/maengel-stillstand.ts'
import type { Register, Zaehler } from './lib/maengel-register.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const z = (wer: string): Zaehler => ({ wirkung: 1, wer, offen: 0, neu: 0, behoben: 0, rueckfall: 0, ausnahme: 0 })
const registerAus = (wer: Record<string, string>): Register => ({ stand: '2026-11-21', zaehler: Object.fromEntries(Object.entries(wer).map(([a, w]) => [a, z(w)])), zeilen: [] })
const register = registerAus({ fsk: 'auto:justwatch', laufzeit: 'auto:anisearch', cover: 'auto:tmdb-poster', neu: 'auto:x', 'titel-de': 'hand:synchro-belegen' })
const tag = (gemessenAm: string, titel: number, maengel?: Record<string, number>): Tagesstand => ({ gemessenAm, titel, ...(maengel && { maengel }) })
const verlauf = [tag('2026-11-17', 100, { fsk: 50, laufzeit: 20, 'titel-de': 5 }), tag('2026-11-18', 101, { fsk: 50, laufzeit: 19, 'titel-de': 5 })]

console.log('\nStillstand der auto-Arten (gebaute Fälle):')
{
  const [kurz, arten] = stillstandZeilen(verlauf, tag('2026-11-21', 104, { fsk: 50, laufzeit: 25, 'titel-de': 5 }), register)
  pruefe('fsk steht, laufzeit steigt: Kurzzeile zählt beide getrennt, Bezug 18.11.', kurz === `${MAENGEL_STILLSTAND_ZEILE}seit 2026-11-18: 1 auto-Arten ohne Abbau, 1 gestiegen (Arten: Logzeile MAENGEL_STILLSTAND_ARTEN)`, kurz)
  pruefe('Artenzeile trennt ohne Abbau und gestiegen', arten === `${MAENGEL_STILLSTAND_ARTEN}ohne Abbau: fsk 50→50 (auto:justwatch) | gestiegen: laufzeit 19→25 (auto:anisearch)`, arten)
  pruefe('Hand-Art (titel-de) wird nicht gemeldet', !arten?.includes('titel-de'), arten)
  const sinkt = stillstandZeilen(verlauf, tag('2026-11-21', 104, { fsk: 49, laufzeit: 18, 'titel-de': 5 }), register)
  pruefe('Gegenprobe: beide um mindestens einen Mangel gesunken, keine Zeile', sinkt.length === 0, sinkt)
  const gleich = stillstandMessen(verlauf, tag('2026-11-21', 101, { fsk: 50, laufzeit: 19 }), register)
  pruefe('Bestand gleich: Stillstand zählt trotzdem (ein Sammler soll die Lücke auch ohne Zuwachs abbauen)', gleich?.stehen.length === 2, gleich)
  const kurzVerlauf = stillstandZeilen(verlauf.slice(1), tag('2026-11-20', 104, { fsk: 50, laufzeit: 19 }), register)
  pruefe('Grenze: erst zwei Tage, Bezug fehlt, keine Zeile', kurzVerlauf.length === 0, kurzVerlauf)
  const nullNull = stillstandMessen([tag('2026-11-18', 1, { cover: 0, fsk: 9 })], tag('2026-11-21', 1, { cover: 0, fsk: 8 }), register)
  pruefe('Art bei 0→0 bleibt still (gelöste Art)', nullNull === undefined, nullNull)
  const ohneMaengel = stillstandMessen([tag('2026-11-15', 1, { fsk: 50 }), tag('2026-11-16', 1)], tag('2026-11-19', 1, { fsk: 50 }), register)
  pruefe('jüngster Tag ≤ Grenze ohne `maengel` wird übersprungen, Bezug ist der ältere mit `maengel`', ohneMaengel?.seit === '2026-11-15' && ohneMaengel.stehen.length === 1, ohneMaengel)
  const neueArt = stillstandMessen(verlauf, tag('2026-11-21', 1, { fsk: 40, neu: 6 }), register)
  pruefe('Art ohne Eintrag am Bezugstag wird übersprungen', neueArt === undefined, neueArt)
  const weg = stillstandMessen(verlauf, tag('2026-11-21', 1, { fsk: 40 }), register)
  pruefe('Art ohne Eintrag heute wird übersprungen', weg === undefined, weg)
  const schwelle = stillstandMessen([tag('2026-11-18', 1, { fsk: 1230, laufzeit: 3 })], tag('2026-11-21', 1, { fsk: 1218, laufzeit: 2 }), register)
  pruefe('Schwelle: fsk −12 von 1230 (< 1 %) steht, laufzeit −1 von 3 baut ab', schwelle?.stehen.join() === 'fsk 1230→1218 (auto:justwatch)' && schwelle.steigen.length === 0, schwelle)
  const genug = stillstandMessen([tag('2026-11-18', 1, { fsk: 1230 })], tag('2026-11-21', 1, { fsk: 1217 }), register)
  pruefe('Schwelle: fsk −13 von 1230 (≥ 1 %) baut ab', genug === undefined, genug)
  const viele = registerAus(Object.fromEntries(Array.from({ length: 99 }, (_, i) => [`a${i}`, 'auto:x'])))
  const alle = (n: number) => Object.fromEntries(Array.from({ length: 99 }, (_, i) => [`a${i}`, i < 50 ? n : n + 1]))
  const [lang] = stillstandZeilen([tag('2026-11-18', 1, alle(5000))], tag('2026-11-21', 1, alle(5000)), viele)
  const warnung = `Mängel Stillstand: ${lang!.slice(MAENGEL_STILLSTAND_ZEILE.length)}`
  pruefe('Lauf-Meldung höchstens 160 Zeichen, auch bei 99 Arten', warnung.length <= 160, warnung.length)
}

/* Ausschnitt aus data/qualitaet-verlauf.json und data/maengel.json (Stand 21.11.2026), Werte je Art in ARTEN-Reihenfolge, null = fehlt. */
const WER: Record<string, string> = { cover: 'auto:tmdb-poster', banner: 'auto:tmdb-banner', 'titel-de': 'hand:synchro-belegen', 'handlung-de': 'auto:anisearch', folgentitel: 'auto:tmdb', folgenzahl: 'auto:anilist', fsk: 'auto:justwatch', wertung: 'auto:anilist', studio: 'auto:anilist', genre: 'auto:anilist', laufzeit: 'auto:anisearch', jahr: 'auto:anilist', sprecher: 'auto:anisearch', 'kein-weg': 'daniel', 'erstausgabe-ohne-weg': 'daniel', 'termin-fehlt-laufend': 'auto:anbieterkalender', 'sprachurteil-offen': 'hand:synchro-belegen', 'synchro-schwach': 'hand:synchro-belegen', 'erschienen-ohne-weg': 'hand:synchro-belegen', 'termin-trotz-nein': 'hand:synchro-belegen', 'termin-geschaetzt-ohne-weg': 'hand:synchro-belegen', 'folgenzahl-widerspruch': 'hand:synchro-belegen', 'adresse-mehrfach': 'hand:synchro-belegen', 'staffel-zuordnung': 'hand:synchro-belegen', 'herkunft-fremder-titel': 'auto:bau', 'weg-ohne-adresse': 'auto:anbieterkalender' }
const ARTEN = Object.keys(WER)
const ECHT: [string, number, (number | null)[] | null][] = [
  ['2026-11-13', 2923, null],
  ['2026-11-14', 2923, null],
  ['2026-11-15', 2923, null],
  ['2026-11-16', 2923, [0, 310, 55, 72, 290, 0, 1232, 108, 105, 173, 307, 6, 362, 200, 166, 3, 163, 79, 3, 3, 4, 29, 0, null, 0, 4]],
  ['2026-11-17', 2924, [0, 310, 32, 72, 291, 0, 1232, 108, 105, 173, 307, 6, 362, 196, 165, 1, 203, 79, 2, 0, 4, 19, 0, 6, 0, 4]],
  ['2026-11-18', 2925, [0, 309, 32, 72, 292, 0, 1230, 108, 105, 173, 307, 6, 369, 198, 168, 2, 55, 65, 2, 0, 4, 19, 0, 6, 0, 3]],
  ['2026-11-19', 2925, [0, 309, 32, 72, 293, 0, 1230, 108, 105, 173, 307, 6, 369, 204, 174, 2, 54, 66, 2, 0, 4, 19, 0, 6, 0, 3]],
  ['2026-11-20', 2925, [0, 309, 32, 72, 292, 0, 1221, 108, 105, 173, 307, 6, 369, 204, 174, 2, 55, 66, 2, 0, 4, 19, 0, 6, 0, 3]],
  ['2026-11-21', 2926, [0, 310, 32, 73, 294, 0, 1222, 108, 105, 173, 307, 6, 370, 204, 174, 2, 59, 66, 2, 0, 4, 19, 0, 6, 0, 6]],
]
const echt = ECHT.map(([am, titel, werte]) => tag(am, titel, werte ? Object.fromEntries(ARTEN.flatMap((a, i) => (werte[i] === null ? [] : [[a, werte[i]!]]))) : undefined))
const amTag = (am: string) => {
  const i = echt.findIndex((t) => t.gemessenAm === am)
  return stillstandMessen(echt.slice(0, i), echt[i]!, registerAus(WER))
}
const namen = (liste: string[] | undefined) => (liste ?? []).map((t) => t.split(' ')[0]).join(',')

console.log('\nStillstand am echten Verlauf (13.–21.11.2026):')
{
  pruefe('16.–18.11. still (Bezug vor dem 16.11. ohne `maengel`)', ['2026-11-16', '2026-11-17', '2026-11-18'].every((am) => amTag(am) === undefined))
  const t19 = amTag('2026-11-19')
  pruefe('19.11. schlägt an, Bezug 16.11., fsk 1232→1230 steht', t19?.seit === '2026-11-16' && t19.stehen.includes('fsk 1232→1230 (auto:justwatch)'), t19)
  pruefe('19.11. stehen genau diese acht Arten', namen(t19?.stehen) === 'banner,handlung-de,fsk,wertung,studio,genre,laufzeit,jahr', namen(t19?.stehen))
  pruefe('19.11. gestiegen: folgentitel, sprecher', namen(t19?.steigen) === 'folgentitel,sprecher', namen(t19?.steigen))
  pruefe('19.11. echter Abbau (termin-fehlt-laufend 3→2, weg-ohne-adresse 4→3) bleibt still', !/termin-fehlt|weg-ohne/.test(JSON.stringify(t19)), t19)
  const t21 = amTag('2026-11-21')
  pruefe('21.11. fsk 1230→1222 (−8, < 1 %) steht, weg-ohne-adresse 3→6 gestiegen', !!t21?.stehen.includes('fsk 1230→1222 (auto:justwatch)') && !!t21.steigen.includes('weg-ohne-adresse 3→6 (auto:anbieterkalender)'), t21)
  pruefe('21.11. gelöste Arten (cover, folgenzahl, herkunft-fremder-titel 0→0) still', !/cover|folgenzahl |herkunft/.test(JSON.stringify(t21)), t21)
}

if (verletzt) {
  console.error(`\n${verletzt} Zusicherung(en) verletzt.`)
  process.exit(1)
}
console.log('\nStillstand der auto-Arten: alle Zusicherungen erfüllt.')
