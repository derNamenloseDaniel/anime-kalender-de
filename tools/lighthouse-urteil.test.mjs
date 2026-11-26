/** Test des Lighthouse-Urteils (`lighthouse-urteil.mjs`): Kennzahlen aus dem Bericht, Median, Grenzen in beide Richtungen, Ratsche samt Ausnahmeweg `LOCKERUNGEN`. */
import assert from 'node:assert/strict'
import { GRENZEN, LOCKERUNGEN, SEITEN } from './lighthouse-grenzen.mjs'
import { gelockert, groessteAnfragen, kennzahlen, mediane, tabelle, verstoesse } from './lighthouse-urteil.mjs'

const bericht = {
  audits: { 'largest-contentful-paint': { numericValue: 923.4 }, 'cumulative-layout-shift': { numericValue: 0.00123 }, 'total-blocking-time': { numericValue: 93.2 }, 'total-byte-weight': { numericValue: 198145 } },
  categories: { performance: { score: 0.99 }, accessibility: { score: 0.96 }, 'best-practices': { score: 0.96 }, seo: { score: 1 } },
}
const k = kennzahlen(bericht)
assert.deepEqual(k, { lcp: 923, cls: 0.001, tbt: 93, bytes: 198145, performance: 99, accessibility: 96, 'best-practices': 96, seo: 100, benchmark: 0 }, 'Kennzahlen aus dem Bericht')
assert.equal(kennzahlen({ ...bericht, environment: { benchmarkIndex: 1834.6 } }).benchmark, 1835, 'Rechnergeschwindigkeit mitgeschrieben')
assert.equal(kennzahlen({ ...bericht, categories: { ...bericht.categories, seo: { score: null } } }).seo, undefined, 'Kategorie ohne Punkte bleibt leer')

assert.equal(mediane([{ ...k, lcp: 900 }, { ...k, lcp: 5000 }, { ...k, lcp: 1000 }]).lcp, 1000, 'Median, nicht Mittel: ein Ausreißer zählt nicht')

const dreiBytes = (a, b, c) => mediane([a, b, c].map((bytes) => ({ ...k, bytes }))).bytes
const bytesVerstoss = (bytes) => verstoesse('Titel', { ...k, bytes }, GRENZEN.pr.Titel).filter((v) => /bytes/.test(v))
assert.equal(dreiBytes(4698189, 4040380, 3415434), 3415434, 'Bytes: Minimum, nicht Median (PR 4317, Lauf 44590780116)')
assert.deepEqual(bytesVerstoss(dreiBytes(4698189, 4040380, 3415434)), [], 'Minimum unter 3 800 000: grün')
assert.deepEqual(bytesVerstoss(dreiBytes(4698189, 4040380, 3900000)), ['Titel: bytes 3900000 > 3800000'], 'alle drei über der Grenze: rot')

const items = [{ url: 'a', transferSize: 10 }, { url: 'b', transferSize: 300 }, { url: 'c' }, { url: 'd', transferSize: 20 }]
assert.deepEqual(groessteAnfragen({ audits: { 'network-requests': { details: { items } } } }, 2), [{ url: 'b', bytes: 300 }, { url: 'd', bytes: 20 }], 'Anfragen nach Größe, gekürzt, ohne Größe weggelassen')
assert.deepEqual(groessteAnfragen(bericht), [], 'ohne Anfrageliste: leer')

const g = { lcp: 1000, cls: 0.1, tbt: 200, bytes: 200000, performance: 95, accessibility: 96, 'best-practices': 96, seo: 100 }
assert.deepEqual(verstoesse('Kalender', k, g), [], 'auf und unter den Grenzen: grün')
assert.deepEqual(verstoesse('Kalender', { ...k, lcp: 1001 }, g), ['Kalender: lcp 1001 > 1000'], 'Obergrenze 1 ms überschritten: rot')
assert.deepEqual(verstoesse('Kalender', { ...k, performance: 94 }, g), ['Kalender: performance 94 < 95'], 'Untergrenze 1 Punkt unterschritten: rot')
assert.equal(verstoesse('Kalender', { ...k, seo: undefined }, g).length, 1, 'nicht gemessen: rot')
assert.equal(verstoesse('Kalender', k, { ...g, tbt: undefined }).length, 1, 'Grenze fehlt: rot')
assert.equal(verstoesse('Kalender', k, undefined).length, 1, 'Seite ohne Grenzen: rot')

const alt = { pr: { Kalender: g } }
assert.deepEqual(gelockert(alt, alt), [], 'unverändert: keine Lockerung')
assert.deepEqual(gelockert({ pr: { Kalender: { ...g, performance: 96, lcp: 900 } } }, alt), [], 'strenger: erlaubt')
assert.deepEqual(gelockert({ pr: { Kalender: { ...g, performance: 94 } } }, alt), ['pr/Kalender/performance: 95 → 94'], 'Kategorie gesenkt: rot')
assert.deepEqual(gelockert({ pr: { Kalender: { ...g, bytes: 200001 } } }, alt), ['pr/Kalender/bytes: 200000 → 200001'], 'Byte-Grenze angehoben: rot')
assert.equal(gelockert({ pr: {} }, alt).length, 8, 'Seite entfernt: jede Grenze zählt')
assert.deepEqual(gelockert(alt, null), [], 'ohne Basis (Datei neu): keine Prüfung')

assert.match(tabelle({ Kalender: k }, { Kalender: g }), /\| Kalender \| 923 \(≤ 1000\) .* 194 KB \(≤ 195 KB\)/, 'Tabelle mit Grenze je Zelle')

for (const profil of ['pr', 'live']) {
  for (const seite of Object.keys(SEITEN)) assert.deepEqual(verstoesse(seite, { ...k, lcp: 0, tbt: 0, bytes: 0, cls: 0, performance: 100, accessibility: 100, 'best-practices': 100, seo: 100, benchmark: 3500 }, GRENZEN[profil][seite]), [], `${profil}/${seite}: jede Grenze gesetzt`)
}

// Runner-Normierung (21.11.2026): echte Lauf-Mediane der Datenbank-Seite aus den Kettenläufen; Messwerte der übrigen Kennzahlen sind gleichgültig (grün).
const db = { ...k, lcp: 14000, cls: 0.001, bytes: 2956332, accessibility: 100, 'best-practices': 100, seo: 100 }
const dbGrenze = GRENZEN.pr.Datenbank
const lauf = (tbt, performance, benchmark) => verstoesse('Datenbank', { ...db, tbt, performance, benchmark }, dbGrenze)
assert.deepEqual(lauf(1047, 53, 2483), [], 'langsamer Runner, Nachlauf 44914299460: TBT 1047 war mit der Einheitsgrenze 1000 rot, jetzt grün')
assert.deepEqual(lauf(1147, 52, 2466), [], 'langsamer Runner, Nachlauf 44903062607: der höchste gemessene Wert (1147) bleibt grün')
assert.deepEqual(lauf(1421, 52, 2466), ['Datenbank: tbt 1421 > 1420 [benchmark 2466]'], 'langsamer Runner: über Band-Grenze (p99 × 1,15, 24.11.2026): rot')
assert.deepEqual(lauf(253, 70, 4304), [], 'schneller Runner, Nachlauf 44897592132: TBT 253, Performance 70 grün')
assert.deepEqual(lauf(681, 70, 4304), ['Datenbank: tbt 681 > 680 [benchmark 4304]'], 'schneller Runner: eigene Grenze, 1 ms darüber rot')
assert.deepEqual(lauf(250, 58, 4304), ['Datenbank: performance 58 < 59 [benchmark 4304]'], 'schneller Runner: Performance 58 war mit 51 grün, jetzt rot')
assert.deepEqual(lauf(542, 61, 2984), [], 'mittlerer Runner (ab 2750): Median aus den Kettenläufen grün')
assert.deepEqual(lauf(981, 61, 2984), ['Datenbank: tbt 981 > 980 [benchmark 2984]'], 'mittlerer Runner: eigene Grenze')
assert.equal(lauf(1000, 54, 2749).length, 0, 'knapp unter 2750: langsames Band')
assert.equal(lauf(1000, 54, 2750).length, 2, 'ab 2750: mittleres Band (TBT und Performance rot)')
assert.equal(lauf(680, 66, 3250).length, 0, 'ab 3250 schnelles Band, 680 ≤ 680')
assert.deepEqual(lauf(500, 60, 0), ['Datenbank: benchmark nicht gemessen'], 'ohne benchmark kein stilles Grün');
for (const [profil, seiten] of Object.entries(GRENZEN)) {
  for (const [seite, grenzen] of Object.entries(seiten)) {
    assert.ok(grenzen.tbt <= grenzen['tbt-mittel'] && grenzen['tbt-mittel'] <= grenzen['tbt-langsam'], `${profil}/${seite}: TBT-Grenzen wachsen mit langsamerem Runner`)
    assert.ok(grenzen.performance >= grenzen['performance-mittel'] && grenzen['performance-mittel'] >= grenzen['performance-langsam'], `${profil}/${seite}: Performance-Grenzen sinken mit langsamerem Runner`)
  }
}
// Ratsche je Band: Obergrenze höher / Untergrenze tiefer ist eine Lockerung, auch bei den Bandschlüsseln.
const altBand = { pr: { Datenbank: { tbt: 540, 'tbt-langsam': 1320, performance: 59, 'performance-langsam': 48 } } }
assert.deepEqual(gelockert({ pr: { Datenbank: { ...altBand.pr.Datenbank, 'tbt-langsam': 1330 } } }, altBand), ['pr/Datenbank/tbt-langsam: 1320 → 1330'], 'Bandgrenze TBT angehoben: rot')
assert.deepEqual(gelockert({ pr: { Datenbank: { ...altBand.pr.Datenbank, 'performance-langsam': 47 } } }, altBand), ['pr/Datenbank/performance-langsam: 48 → 47'], 'Bandgrenze Performance gesenkt: rot')
assert.deepEqual(gelockert({ pr: { Datenbank: { ...altBand.pr.Datenbank, 'tbt-langsam': 1200, 'performance-langsam': 50 } } }, altBand), [], 'Bandgrenzen strenger: erlaubt')
// Ausnahmeweg (24.11.2026): eine Lockerung kommt nur durch, wenn genau dieser Schritt in LOCKERUNGEN steht.
const schritt = { profil: 'pr', seite: 'Datenbank', grenze: 'tbt-langsam', von: 1320, auf: 1420, datum: '2026-11-24', grund: 'Test' }
const locker = { pr: { Datenbank: { ...altBand.pr.Datenbank, 'tbt-langsam': 1420 } } }
assert.deepEqual(gelockert(locker, altBand), ['pr/Datenbank/tbt-langsam: 1320 → 1420'], 'ohne Eintrag: rot (Stand main)')
const heute = new Date('2026-11-24T18:00:00Z')
assert.deepEqual(gelockert(locker, altBand, [schritt], heute), [], 'genau dieser Schritt eingetragen: erlaubt')
assert.deepEqual(gelockert(locker, altBand, [schritt], new Date('2026-12-08T00:00:00Z')), [], 'Eintrag 14 Tage alt: noch erlaubt')
assert.deepEqual(gelockert(locker, altBand, [schritt], new Date('2026-12-09T00:00:00Z')), ['pr/Datenbank/tbt-langsam: 1320 → 1420'], 'Eintrag älter als 14 Tage: rot (Rückschritt auf denselben Wert)')
for (const [feld, wert] of [['profil', 'live'], ['seite', 'Titel'], ['grenze', 'tbt'], ['von', 1300], ['auf', 1400]]) {
  assert.deepEqual(gelockert(locker, altBand, [{ ...schritt, [feld]: wert }], heute), ['pr/Datenbank/tbt-langsam: 1320 → 1420'], `Eintrag mit anderem ${feld}: rot`)
}
assert.deepEqual(gelockert({ pr: { Datenbank: { ...altBand.pr.Datenbank, 'tbt-langsam': 1430 } } }, altBand, [schritt], heute), ['pr/Datenbank/tbt-langsam: 1320 → 1430'], 'weiter als eingetragen: rot')
assert.deepEqual(gelockert({ pr: { Datenbank: { tbt: 540, performance: 59, 'performance-langsam': 48 } } }, altBand, [schritt], heute), ['pr/Datenbank/tbt-langsam: entfernt (main 1320)'], 'entfernte Grenze: rot trotz Eintrag')
const main2111 = { pr: { Titel: { tbt: 760, 'tbt-mittel': 1100, 'tbt-langsam': 1610 } }, live: { Kalender: { tbt: 100 } } }
assert.deepEqual(gelockert(GRENZEN, main2111, LOCKERUNGEN, heute), [], 'Lockerung vom 24.11.2026 steht in LOCKERUNGEN (pr und live)')
assert.equal(gelockert(GRENZEN, main2111).length, 4, 'dieselbe Lockerung ohne LOCKERUNGEN: rot')
// Alarm 24.11.2026 (Nachlauf 45424597997): Titel TBT 1102 bei benchmark 2754 ist im Band mittel jetzt grün.
assert.deepEqual(verstoesse('Titel', { ...db, lcp: 14000, bytes: 3459355, tbt: 1102, performance: 50, benchmark: 2754 }, GRENZEN.pr.Titel), [], 'Nachlauf 45424597997: grün')
assert.match(tabelle({ Datenbank: { ...db, tbt: 1047, performance: 53, benchmark: 2483 } }, { Datenbank: dbGrenze }), /1047 \(≤ 1420\).* 53 \(≥ 48\).* 2483 \|$/m, 'Tabelle zeigt die Grenze des Bands und den benchmark')
console.log('lighthouse-urteil ✓')
