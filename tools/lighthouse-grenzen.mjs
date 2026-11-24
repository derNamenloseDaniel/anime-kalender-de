/**
 * Grenzen der Lighthouse-Messung (`lighthouse-messen.mjs`), je Profil (`pr`: Build in der PR-Kette, `live`: anime-kalender.de) und Seite.
 * Obergrenzen: lcp/tbt in ms, cls, bytes (Übertragung gesamt, mit Covern); Untergrenzen: Kategorien in Punkten.
 * Ratsche: eine Grenze darf nur strenger werden (Prüfung gegen main im PR), außer der Schritt steht in `LOCKERUNGEN` (unten). Herleitung: docs/wissen/betrieb.md, „Lighthouse und Leerlauf als Wächter“.
 *
 * Basis 18.11.2026, je Median aus 3 Läufen auf CI-Runnern: zwei PR-Läufe gegen dist (44259412724, 44260602007) und drei Live-Läufe (44259410560, 44260603953, 44261473268).
 * Budget LCP ≤ 2500, CLS ≤ 0,1, TBT ≤ 200 wo auf jedem Runner eingehalten; sonst Ratsche = höchster Median × 1,15 (LCP, ±10 %) bzw. × 1,3 (TBT).
 * TBT und Performance hängen am Runner: derselbe Stand ergab TBT 228–765 ms (Datenbank), 25–206 ms (Kalender), Performance 71–56 — Lighthouse simuliert 4× CPU auf
 * dem jeweiligen Rechner. Seit 21.11.2026 gelten TBT und Performance je Runner-Band (`BAND_*` unten) statt einer Zahl für alle. Bytes: höchster Median × 1,15 (Datenwachstum; Kalender zweigipflig,
 * 0,61 oder 1,17 MB, je nachdem, ob das Nachladen der vollen Daten nach ≤ 6 s noch ins Messfenster fällt). Performance: niedrigster Median − 5.
 * Accessibility und SEO deterministisch, ohne Abstand; Best Practices − 4 (die Konsole zählt Fehler fremder Cover-Adressen mit).
 */
export const SEITEN = {
  Kalender: '',
  Datenbank: '#/datenbank',
  Titel: '#/datenbank?t=21',
}

/**
 * TBT (ms, Obergrenze) und Performance (Punkte, Untergrenze) je Runner-Band (benchmarkIndex; Urteil: `lighthouse-urteil.mjs`, `grenzeFuer`).
 * Grundgrenze = schnelle Runner (≥ 3250), `-mittel` 2750–3250, `-langsam` darunter; Herleitung: betrieb.md, „TBT auf den Runner normiert“.
 * TBT seit 24.11.2026: p99 des Bands × 1,15 (auf 10 aufgerundet) aus 557 Läufen vom 21.11. 01:37 bis 24.11. 15:21 UTC (n = 129–258 je Band;
 * Bericht daniel-zum-abarbeiten/berichte/tbt-baender-2026-11-24.md). Performance seit 21.11.2026: niedrigster Lauf-Median − 4 aus 68 Läufen.
 */
const BAND_KALENDER = { tbt: 110, 'tbt-mittel': 170, 'tbt-langsam': 260, performance: 95, 'performance-mittel': 95, 'performance-langsam': 92 }
const BAND_DATENBANK = { tbt: 680, 'tbt-mittel': 980, 'tbt-langsam': 1420, performance: 59, 'performance-mittel': 55, 'performance-langsam': 48 }
const BAND_TITEL = { tbt: 1090, 'tbt-mittel': 1210, 'tbt-langsam': 1720, performance: 54, 'performance-mittel': 49, 'performance-langsam': 45 }

/** Beide Profile messen dieselben Seiten; LCP und Bytes lagen höchstens 12 % auseinander, eine gemeinsame Grenze deckt beide. */
const BASIS_18_11 = {
  // Median pr1/pr2/live1/live2/live3: LCP 923/931/981/981/933, TBT 53/99/25/128/206 (Budget 200 auf langsamem Runner gerissen: Ratsche), Bytes 609 343–1 174 783, Performance 100/99/100/99/97.
  Kalender: { lcp: 2500, cls: 0.1, ...BAND_KALENDER, bytes: 1350000, accessibility: 96, 'best-practices': 96, seo: 100 },
  // Median pr1/pr2/live1/live2/live3: LCP 12 750/12 359/14 255/14 328/11 481, TBT 228/591/264/751/765, Bytes 2 895 718–2 970 014, Performance 71/60/70/57/56 — über Budget.
  Datenbank: { lcp: 16500, cls: 0.1, ...BAND_DATENBANK, bytes: 3450000, accessibility: 100, 'best-practices': 96, seo: 100 },
  // Median pr1/pr2/live1/live2/live3: LCP 15 406/13 761/16 518/6 977/16 883, TBT 353/920/375/588/1 083, Bytes ≈ 2 048 000–3 479 058, Performance 66/53/65/61/52 — über Budget.
  Titel: { lcp: 19500, cls: 0.1, ...BAND_TITEL, bytes: 4000000, accessibility: 100, 'best-practices': 96, seo: 100 },
}

/**
 * Profil `pr` seit 19.11.2026: Bytes = Minimum der Läufe (Bericht daniel-zum-abarbeiten/berichte/lighthouse-bytes-streuung-2026-11-19.md),
 * Grenze = Minimum über 7 Jobs × ca. 1,1: Kalender 693 907 → 800 000, Datenbank 2 948 776 → 3 350 000, Titel 3 459 355 → 3 800 000.
 * `live` behält die alten Bytes-Grenzen (dort nicht nachgemessen).
 */
const BASIS_PR = {
  Kalender: { ...BASIS_18_11.Kalender, bytes: 800000 },
  Datenbank: { ...BASIS_18_11.Datenbank, bytes: 3350000 },
  Titel: { ...BASIS_18_11.Titel, bytes: 3800000 },
}

export const GRENZEN = {
  pr: BASIS_PR,
  live: BASIS_18_11,
}

/** Lockerung der TBT-Bänder vom 24.11.2026 in beiden Profilen (sie teilen `BAND_*`). */
const tbt2411 = (seite, grenze, von, auf) =>
  ['pr', 'live'].map((profil) => ({ profil, seite, grenze, von, auf, datum: '2026-11-24', grund: '27 Fehlalarme in 557 Läufen, keine Regression; Grenze = p99 × 1,15 (Bericht tbt-baender-2026-11-24.md)' }))

/**
 * Ausnahmeweg der Ratsche (`gelockert`): eine Grenze darf nur lockerer werden als auf main, wenn genau dieser Schritt
 * (profil/seite/grenze, von → auf) hier mit Datum und Grund steht. Einträge bleiben als Chronik; nach dem Merge passen sie auf keinen neuen Schritt.
 */
export const LOCKERUNGEN = [
  ...tbt2411('Kalender', 'tbt', 100, 110),
  ...tbt2411('Kalender', 'tbt-mittel', 150, 170),
  ...tbt2411('Kalender', 'tbt-langsam', 250, 260),
  ...tbt2411('Datenbank', 'tbt', 540, 680),
  ...tbt2411('Datenbank', 'tbt-mittel', 730, 980),
  ...tbt2411('Datenbank', 'tbt-langsam', 1320, 1420),
  ...tbt2411('Titel', 'tbt', 760, 1090),
  ...tbt2411('Titel', 'tbt-mittel', 1100, 1210),
  ...tbt2411('Titel', 'tbt-langsam', 1610, 1720),
]
