<!-- titel: Disc-Bereich im Panel: jede Ausgabe als Pille mit Direktlink, keine Einzelgruppe mehr zugeklappt, Dubletten zusammengeführt -->

Zweig `feat/disc-bereich-sichtbar` (Kopf `63df57d8`, main eingemergt). Auftrag Daniel, 26.11.2026 21:31, Panel „The Most Heretical Last Boss Queen“ Staffel 1 (AniList 156040): „disc pill bereiche sind zu unscheinbar, und unnötige klicks sind notwendig um die discs zu finden (1 eintrag – man muss erst ausklappen und dann den eintrag wählen)“.

## Was

**Anlassfall, gemessen an der echten Seite (lokaler Bau, Daten vom 26.11.2026):**

| | Vorher (main `63bc8fd1`) | Nachher |
|---|---|---|
| Varianten im Kasten | 2 („Gesamtausgaben · 1“ offen, „Sonstiges · 1“ zugeklappt) – dieselbe Box zweimal | 1 Pille „Gesamtausgabe · Complete Box“ |
| Sichtbare Links zum Händler | 0 | 1 („Bei Amazon ↗“, EAN-Suche `4020628654016`) |
| Klicks bis zum Händler | 2–3 (Gruppe auf, Zeile antippen, Knopf) | 1 |
| Höhe des Kastens am Handy 390 | 296 px | 187 px |

1. **Dublette (Daten des Falls geprüft):** `public/data/releases.json` hat genau einen Disc-Termin (`most-heretical-last-boss-queen-s1-box`, „Complete Box, Blu-ray“, 03.09.2026, KSM Anime, Quelle anime2you). Die zweite Zeile kam aus `public/data/disc/…` (aniSearch-Artikel 209535, „Gesamtausgabe“, Blu-ray, 03.09.2026). Der Termin nennt den Artikel nicht in `sources`, deshalb wurden es zwei Varianten. Neu (`amSelbenTag` in `web/src/components/detail/disc-ausgaben.ts`): Ein Termin ohne Artikelbezug ist der aniSearch-Artikel desselben Tages mit gemeinsamem Format, wenn es an dem Tag **genau einen** freien Artikel und **genau einen** losen Termin gibt und kein Band widerspricht („Vol. 2“ ist nie die Gesamtausgabe, nie „Vol. 3“). Sonst bleibt alles getrennt.
   - Bestand 26.11.2026 (2.097 Titel mit Disc, Zählskript über `discAusgabenVon` je Titel aus `public/data/disc/*.json` + `releases.json`): lose Termine 183 → 60, 123 zusammengeführt. 40 Paare von Hand gelesen (z. B. Vampire Knight Guilty „Complete Box“ ⇔ „Gesamtausgabe“, Detektiv Conan „Box 9“ ⇔ „Box 09“, Yu-Gi-Oh! „Komplettbox“ ⇔ „Gesamtausgabe“), alle dieselbe Ausgabe. Bewusst **nicht** zusammengeführt: 12 mehrdeutige Tage und „Shin Chan – Vol. 9-12“ ⇔ „Box 03“ (Bandnummern widersprechen sich, Gleichheit nicht belegt).
   - Gegenfall aus der Bühne, den die erste Fassung der Regel falsch zusammengelegt hätte (im Test): „DAN DA DAN (Staffel 2) – Vol. 2“ am 30.10.2026, demselben Tag wie die Gesamtausgabe von Staffel 1.
2. **Jede Variante ist eine Pille mit Direktlink** (`disc-pillen.tsx`, baut auf der vorhandenen `Pille` auf): Name und Edition, darunter Format als Marke und Datum („seit 03.09.26“ leise, „ab 18.12.26“ in Akzent), rechts das Ziel. Die ganze Pille ist der Link: Produktseite vor EAN-Suche vor Namenssuche (`zielVon`), Beschriftung wie bisher („Kaufen bei …“, „Bei Amazon“, „Bei Amazon suchen“). Ohne Händler führt sie zum aniSearch-Artikel und heißt „Details bei aniSearch“ (aniSearch bleibt Quelle, nie Händler). Der Kalenderknopf (`MerkenKnopf`, wie an den Stream-Pillen) steht nur neben Kommendem.
3. **Gruppen:** Eine Gruppe mit einem Eintrag hat keinen Klappknopf und keine Zahl; gibt es nur eine Gruppe, entfällt ihr Kopf ganz. Zugeklappt starten weiterhin nur Volumes/Filme/Sonstiges **mit mehreren Einträgen** neben Gesamtausgaben oder Boxen (Daniels Entscheidung vom 27.10.2026 bleibt). Ab neun Pillen je Gruppe: sechs und „Alle n anzeigen“.
4. **Nichts doppelt:** „1 Variante“ über einer einzelnen Pille entfällt (der Verlag bleibt); die Zeile „Quelle: aniSearch“ unter dem aufgeklappten Händlerblock entfällt, wo ein Händler das Ziel ist.

**Nicht gebaut, mit Grund:** Bild und Preis je Ausgabe. Der Datensatz kennt beides nicht (weder `releases.json` noch `disc/*.json` führen Preis oder Packshot); nichts erfunden, keine neuen Bilder geladen.

## Variantenvergleich (Bühne, Mockup `disc-bereich-3`, Echtdaten)

Fälle: `last-boss-queen-disc` (neu, Anlass), `trigun-stampede-disc` (1), `dan-da-dan-disc` (Gruppen), `sakamoto-days-disc`, `fernsehtag-detektiv-conan-disc` (19–20 Varianten), `one-piece-disc`. `npm run buehne:messen` für das Mockup: 72 Nachher-Zellen, 0 neue Befunde (Tippziele, Kontrast).

| | A – Pillen (gewählt) | B – offene Matrix mit Kaufspalte | C – Karten zu zweit |
|---|---|---|---|
| Detektiv Conan, Handy 375 dunkel | ![A](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-A-375-dunkel.png) | ![B](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-B-375-dunkel.png) | ![C](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-C-375-dunkel.png) |
| Detektiv Conan, Desktop 512 hell | ![A](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-A-512-hell.png) | ![B](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-B-512-hell.png) | ![C](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-fernsehtag-detektiv-conan-disc-C-512-hell.png) |
| Last Boss Queen, Handy 375 dunkel | ![A](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-A-375-dunkel.png) | ![B](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-B-375-dunkel.png) | ![C](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-C-375-dunkel.png) |
| Last Boss Queen, Desktop 512 hell | ![A](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-A-512-hell.png) | ![B](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-B-512-hell.png) | ![C](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/mockup-last-boss-queen-disc-C-512-hell.png) |

Die Mockup-Bilder entstanden vor dem Dubletten-Fix und zeigen bei Last Boss Queen deshalb noch zwei Einträge; die Nachher-Bilder unten zeigen den gebauten Stand.

**Warum A:** A sieht aus wie die Stream-Pillen daneben (gleiche Fläche, gleiche Höhe 52 px, gleiche Schrift 15/13 px) und trägt bei 1 wie bei 19 Varianten: Name, Format, Datum und Ziel stehen ohne Raster. B bricht am Handy: Bei zwei Formaten laufen die Datumsspalten ineinander („ab 18.12.26ab 18.12.26“) und der Name wird auf drei Zeilen gequetscht. C wird doppelt so hoch und schneidet am Handy Datum und Knopftext ab (zwei Karten je Zeile sind bei 375 px zu schmal). Rangfolge nach `design-regeln.md` E1: Bedienbarkeit am Handy vor Platznutzung.

## Vorher / Nachher (echte Seite, Antwortkasten auf „Disc“)

Handy 390 × 844 (`isMobile`, `hasTouch`), Desktop 1600 × 900; Playwright gegen `dist/` ohne Server.

**The Most Heretical Last Boss Queen (Anlass, 1 Ausgabe)**

| | Vorher | Nachher |
|---|---|---|
| Handy dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-handy-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-handy-dunkel.png) |
| Handy hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-handy-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-handy-hell.png) |
| Desktop dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-desktop-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-desktop-dunkel.png) |
| Desktop hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-desktop-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-desktop-hell.png) |
| Ganze Ansicht, Handy dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-handy-dunkel-ganz.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-handy-dunkel-ganz.png) |
| Ganze Ansicht, Desktop hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-156040-desktop-hell-ganz.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-156040-desktop-hell-ganz.png) |

**Detektiv Conan (19 Varianten, eine Gruppe)**

| | Vorher | Nachher |
|---|---|---|
| Handy dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-235-handy-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-235-handy-dunkel.png) |
| Handy hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-235-handy-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-235-handy-hell.png) |
| Desktop dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-235-desktop-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-235-desktop-dunkel.png) |
| Desktop hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-235-desktop-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-235-desktop-hell.png) |

**Dan Da Dan (Gesamtausgabe + Volumes + Sonstiges)**

| | Vorher | Nachher |
|---|---|---|
| Handy dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-171018-handy-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-171018-handy-dunkel.png) |
| Handy hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-171018-handy-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-171018-handy-hell.png) |
| Desktop dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-171018-desktop-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-171018-desktop-dunkel.png) |
| Desktop hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-171018-desktop-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-171018-desktop-hell.png) |

**Sakamoto Days (Volumes, zwei kommende mit Kalenderknopf)**

| | Vorher | Nachher |
|---|---|---|
| Handy dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-177709-handy-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-177709-handy-dunkel.png) |
| Handy hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-177709-handy-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-177709-handy-hell.png) |
| Desktop dunkel | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-177709-desktop-dunkel.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-177709-desktop-dunkel.png) |
| Desktop hell | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/vorher-177709-desktop-hell.png) | ![](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/prtext/disc-bereich-sichtbar/bilder/nachher-177709-desktop-hell.png) |

Was auf den Bildern zu sehen ist: Vorher graue Matrixzeilen mit 11-px-Daten, kein Link, zugeklappte Einzelgruppe. Nachher je Ausgabe eine Pille in der Fläche der Stream-Pillen, Ziel in Akzentfarbe rechts (am Handy rutscht „Details bei aniSearch ↗“ unter Format und Datum, statt den Namen zu quetschen), Kalenderknopf rund neben kommenden Ausgaben.

## Beleg

**Messung am gebauten Stand** (Skript wie für die Bilder; Titel 156040, 235, 171018, 177709, 21; Handy und Desktop, hell und dunkel): Pille mindestens 52 px hoch, Klapp- und Kalenderknöpfe 44 px, kleinste Schrift 11 px (Formatmarke), kein waagerechter Überlauf. Maße nach `design-regeln.md` Abschnitt 13 (E2: 44 px Handy; E7: Beschriftung ≥ 11 px).

**Startbudget** (`node tools/start-budget.mjs`, KB gzip von 190,0): Basis main `63bc8fd1` 171,0 · Zweig vor dem Merge 170,9 · Zweig mit eingemergtem main `22d37f70` 171,1 (der Zuwachs von 0,2 kommt mit #5077 aus main; die neue Basis habe ich nicht getrennt gebaut). Keine neuen Bilder, keine neue Bibliothek, kein neues Feld im Datensatz.

**Alte Farbklassen:** `node tools/design-klassen.mjs` grün, „Gesunken“ (mit `disc-matrix.tsx` entfiel nichts Neues, neuer Code nur `ak-*`).

**Tests** (`npx tsx pipeline/check-disc-bereich.ts`, 72 Zusicherungen, alle grün; Fixtures aus `web/buehne/faelle.json` und feste Probedaten ab Kennung 900310, `today` fest `2026-10-11`):
- Render des echten `DiscBereich` auf dem Mini-DOM: Einzelgruppe ohne Klappknopf und ohne Zahl; einzige Gruppe ohne Kopf; mehrere Volumes zugeklappt mit Zahl und Jahren, Pfeil ▾/▴; Pille mit Ziel ohne Tipp (aniSearch-Artikel, Namenssuche, EAN, Produktseite); keine Pille ohne Ziel; Kalenderknopf nur an Kommendem; Akzent nur an Kommendem; Grenze 8 (alle) / 9 (sechs + Knopf); kein leerer Kopf; Anlassfall: eine Pille, kein Knopf, EAN-Link.
- Dubletten: gleicher Tag/gleiches Format 1:1 → eine Zeile mit Artikel, Termin und Händler; anderer Tag, anderes Format, ohne Datum, zwei Artikel, zwei lose Termine, „Vol. 2“ gegen Gesamtausgabe, „Vol. 2“ gegen „Vol. 3/3“, DVD- neben Blu-ray-Termin, Artikel schon von einem anderen Termin genannt → getrennt.
- **Basis rot:** derselbe Test gegen die Seitendateien von main (`git checkout origin/main -- web/src/components/detail web/src/lib/i18n-spaet.ts`): `✖ die Gruppe mit einem Eintrag hat keinen Klappknopf, nur ihren Namen — gefunden: ["Gesamtausgaben · 1 · 2026▴", …]`, `✖ … und ihre Pille steht ohne Tipp da …`, danach Abbruch mit `TypeError` (Exit 1).

**Mutationsprobe** (`node tools/diff-mutanten.mjs --liste`, gefiltert auf `web/src/`, gefahren mit `tools/mutationslaeufer.mjs --test "npx tsx pipeline/check-disc-bereich.ts"`): 191 Mutanten, 189 rot, 2 überleben und sind gleichwertig:
- `disc-bereich.tsx:30` `useState(false)` → `useState()`: `undefined` ist wie `false` „nicht alle“.
- `disc-bereich.tsx:88` zweiter Parameter von `startOffen` **im `key`**: Für Volumes/Filme/Sonstiges liefert `startOffen(alle)` denselben Wert (`!gross`), für Gesamtausgaben/Boxen ist der Schlüssel in beiden Fassungen konstant; der Schlüssel wechselt also in denselben Fällen.
- Erster Lauf hatte 21 Überlebende; dafür kamen Fälle dazu (Commits `7d1044c9`, `8638c647`), eine dadurch als überflüssig erkannte Bedingung in `amSelbenTag` ist entfernt. `pille.tsx:55` wurde nach dem zweiten Lauf von Hand gegengeprüft (rot).
- Mockup-Dateien (`web/buehne/mockups/disc-bereich-3*`, 151 Mutanten) und `tools/buehne-faelle.mjs` (4) sind nicht mutiert geprüft: Mockup-Code ohne eigene Tests.

**Weitere Läufe lokal, alle Exit 0:** `npx tsc --noEmit -p .`; `npx tsx pipeline/check-logic.ts` (Quelltextprüfung der Pille „mindestens 52 px“ hält, der wörtliche Stream-Zweig blieb); 52 Prüfungen, die eine berührte Datei importieren (`grep -l` auf `disc-*`, `detail/pille.tsx`, `wege-zeilen`, `DetailPanel`, `i18n-spaet`); `pipeline/check-beleg-href.ts`; `tools/umfang-pruefen.mjs`; `tools/design-immer-dunkel.test.mjs`; `tools/design-fokus.test.mjs`; `tools/uhr-in-tests.mjs`; `tools/title-tooltips.mjs`; `tools/mutationsanker.mjs --diff` (0 tote Anker); `tools/buehne-faelle-nur-lauf.test.mjs`; `eslint` auf allen geänderten Dateien.
**Nicht lokal gefahren** (Kette): `check:vor-commit`, `check:panel`, `check:ansichten`.

## Geänderte Dateien

- `web/src/components/detail/disc-pillen.tsx` (neu): Pillenliste der Varianten.
- `web/src/components/detail/disc-bereich.tsx`: Gruppenregeln, Kopfzeile.
- `web/src/components/detail/disc-matrix.tsx` (gelöscht): Matrix samt aufklappendem Händlerblock.
- `web/src/components/detail/disc-varianten.ts`: `zielVon`, `formateJeDatum`; Name „Gesamtausgabe“ statt „Gesamt“; `spaltenVon` entfällt (nur die Matrix brauchte es).
- `web/src/components/detail/disc-ausgaben.ts`: `amSelbenTag`, `gleicherBand`, `perArtikel`.
- `web/src/components/detail/pille.tsx`: Eigenschaft `breit` (Pille füllt die Zeile); Stream-Pillen unverändert.
- `web/src/lib/i18n-spaet.ts`: `disc.ab`, `disc.details` neu; `disc.variante`, `disc.kalender`, `disc.google`, `disc.datei`, `disc.quelle` entfallen („seit“ nimmt das vorhandene `antwort.discSeit`).
- `pipeline/check-disc-bereich.ts`, `pipeline/check-beleg-href.ts` (Eintrag der gelöschten Datei entfernt).
- Bühne: `web/buehne/mockups/disc-bereich-3.tsx`, `-teile.tsx`, `-varianten.tsx` (neu), `web/buehne/fall-optionen.ts`, `tools/buehne-faelle.mjs`, `web/buehne/faelle.json` (nur der Fall `last-boss-queen` ergänzt, `--nur`).
- `docs/wissen/betrieb.md` (Abschnitt Bühne: Runde 3, Regeln, Dubletten-Messung), `data/patchnotes/disc-mit-einem-klick-zum-haendler.yaml`.

Nutzertext-Fundliste (alter Wortlaut gesucht in `pipeline/check-*`, `tools/`, `data/patchnotes`, `docs`): „Gesamt“, „1 Variante“, „Kalendereintrag“, „Quelle: aniSearch“, `data-disc-haendler` kamen außerhalb der geänderten Dateien nur in den Mockups der Runden 1 und 2 vor (eigene Kopien, unberührt).

## Offen für den Dirigenten

1. **„Höchstens ein Klick bis zum Händler“ gilt nur, wo der Datensatz einen Händlerlink hat:** 233 Disc-Termine von 188 Titeln tragen einen Amazon-Link; die übrigen Ausgaben (aniSearch-Artikel von 2.086 Titeln) führen mit einem Klick zum aniSearch-Artikel. Einen Amazon-Suchlink für diese Ausgaben habe ich nicht erfunden (Regel vom 27.10.2026: eine Namenssuche verspricht kein Produkt). Wer hier einen echten Händlerlink will, braucht die EAN aus `data/anisearch-artikel.json` im Panel – eigener Auftrag.
2. **Bühne:** A steht nach dem Bau mit `ersatz: {}` im Mockup (gleich „Vorher“); B und C bleiben zum Vergleich. Nicht hochgeladen und kein Epic im Navigator (Cloud-Sitzung ohne `ticket-board`); der Vergleich steht deshalb als Bilder hier.
3. Die Bühne kennt nur 375 und 512 px; die verlangten 390 px und Desktop sind an der echten Seite aufgenommen (390 und 1600).
4. `daniel-zum-abarbeiten/stand.md` ist nicht angefasst.

## Live-Beleg

Entfällt (keine Änderung an Live-Daten; `public/data` unberührt). Nach dem Deploy prüfbar: `https://anime-kalender.de/t/14693` → „Disc“ zeigt eine Pille „Gesamtausgabe · Complete Box“ mit „Bei Amazon ↗“; falsch, wenn zwei Einträge oder ein Klappknopf erscheinen.

## Patch Notes

`data/patchnotes/disc-mit-einem-klick-zum-haendler.yaml` — „Discs mit einem Klick beim Händler“ / „Im Detail-Panel unter „Disc“, jede Ausgabe mit Direktlink“ (feature).

Schätzung vs. Ist: beim Start keine Schätzung notiert; Ist 20:33–21:20 Uhr.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zppzz2trbY4Lf6utq3
