<!-- titel: fix(daten): Joyn-Folgen, Takt und Finale aus der TV-Ausstrahlung, ohne ≈ -->

## Ursache

Yaiba: Samurai Legend läuft bei ProSieben MAXX (Mo–Fr 18:25) und danach auf Joyn. Beide Termine kannten nur gesichtete Folgen (`observed` bis Folge 10, Stand 20.11.). Alles danach galt als „Fortschreibung“ (`terminGeschaetzt`, `shared/logic.ts`), obwohl der Sendeplan samt Pausen bekannt ist. Daraus entstanden alle vier Fehler:

- **„≈ Fg. 1–10“:** `joynAngabe` (`web/src/lib/joyn.ts`) setzte bei jedem Fenster „≈“; die Fenster stammten nur aus den gesichteten Tagen (`setzeJoynFenster`, `13-1-joyn-fenster.ts`).
- **„Takt unklar“:** `taktUnklarBei` (`antwort-block.ts`) greift bei geschätzten Joyn-Wochenterminen, deren `observed` vom 7-Tage-Takt abweicht — bei Mo–Fr-Plänen immer.
- **„Finale ≈ 10.12.“:** `ungefaehr(datum, … || taktUnklar)` — Folge der vorigen Zeile.
- **„voraussichtlich um 18:50“:** Der Kasten nahm den Joyn-Termin (Fr 27.11., 18:50) als Haupttermin; der Satz sagt immer „voraussichtlich“.
- **Hinweis „(seit 05.11.2026 belegt)“:** Handtext in `data/curated/tv-2026.yaml`.

## Klasse (gezählt an `public/data/releases.json`, Stand 26.11.2026)

- Joyn-Releases: 5. Davon mit TV-Partner einer Joyn-Gruppe: 3 (Yaiba weekly; Dororo und Hells Paradise sind Joyn-Stapel ab 02.10. neben ProSieben-FUN-Wochenterminen, ohne Muster „nach der Ausstrahlung“ — unberührt). **Betroffen: 1 (Yaiba).**
- Belegvermerke im Hinweis (50 Hinweise gesamt, 2 mit „belegt“): 1 Belegdatum im Hauptkasten (Yaiba), 1 „nicht belegt“ (`auto-213805-netflix`, Aussage über fehlenden Beleg, kein Vermerk). **Geschlossen: 1 von 1.**

## Ansatz

Untergrenze: ein `sendeplanBelegt: true` von Hand am TV-Plan; kleinster Weg ohne neues Sammeln.

- `schedule.sendeplanBelegt` (`shared/types.ts`, `shared/logic.ts`): kein Folgentag des Plans gilt als geschätzt. Gesetzt in `data/curated/tv-2026.yaml` (Mo–Fr, belegte Pausen 13.11. und 17.11.).
- `leiteJoynAusTv` (`pipeline/bau/13-1-joyn-aus-tv.ts`, aufgerufen in `13-schreiben.ts`): Joyn-Wochentermin mit TV-Partner (ProSieben-Gruppe, belegter Plan) übernimmt Plan und Pausen; Uhrzeit bleibt die des Joyn-Termins (ab Sendeende).
- `setzeJoynFenster` nutzt bei belegtem Plan dessen Folgentage (`tageAusPlan`); nur die 19 Folgen vor der ersten Sichtung tragen `geschaetzt` (`shared/folgen-fenster.ts`). Die Pille schreibt „≈“ nur dann (`joyn.ts`).
- `antwort-kopf.tsx`, `i18n-spaet.ts`: ein belegter Joyn-Termin sagt „ab 18:50 Uhr“ statt „voraussichtlich um“.
- Hinweis ohne Belegdatum; es steht bei den Quellen (Joyn-Quelle mit `gesehenAm`).
- Patchnote `data/patchnotes/joyn-folgen-wie-im-fernsehen.yaml`.
- `pipeline/check-joyn-hand-tv.ts`: Erwartung der Pille ohne „≈“ für gesichtete Folgen; `tools/check-logic-liste.txt`: neuer Test.

## Beleg

Schnellweg auf echten Daten (`public/data`, heute 26.11.2026 19:40 UTC, Skript ohne Schreiben):

| | Basis (origin/main) | mit Fix |
|---|---|---|
| Joyn-Folgen 11–24 | alle ≈ | ohne ≈, Folge 24 am 10.12. |
| Joyn-Pille | „Fg. 1–10“ (mit ≈ an der Basis) | „Fg. 1–14 · Fg. 15 ab 27.11.“ |
| `taktUnklar` im Panel | true | false |
| Haupttermin Folge 15 | `estimated`, „voraussichtlich um 18:50“ | belegt, „ab 18:50 Uhr“ |
| Wächter `joynHinterTv` | 2 Fehler (14 geschätzt, 10 statt 14 erschienen) | 0 |
| Wächter `belegvermerkImHinweis` | 1 Fehler | 0 |

Test `pipeline/check-joyn-folgen-aus-tv.ts` (Fixtures, festes heute): grün; Mutationsprobe — ohne `sendeplanBelegt` in `leiteJoynAusTv`: 2 rot; `<` zu `>` im Zähl-Vergleich: 1 rot; „≈“ immer in der Pille: 1 rot. Grün: `check-joyn-hand-tv`, `check-joyn-termine-belegt`, `check-joyn-luecke`, `check-joyn-termine-bestand`, `check-takt`, `check-folge-ueber-anzahl`, `check-pruefung-*`, `tsc --noEmit -p .`, `check:umfang`, `data:validate`, `mutationsanker-alle`, `check-workflows`.

## Warum die Prüfungen es durchließen

- `check-joyn-termine-belegt` (10.11.) schloss den Fall nur für die damals gesichteten Folgen 1–4; „der Plan ist belegt“ gab es als Begriff nicht, jede Folge hinter der letzten Sichtung blieb ≈.
- `pruefung.ts` verglich Joyn nie mit dem TV-Partner; „Joyn zählt weniger als das Fernsehen“ war kein Fehler. Jetzt: `joynHinterTv`.
- Die Pille hatte „≈“ hart eingebaut; kein Test unterschied gerechnete von belegten Fenstern.
- Belegvermerke im Hinweis hatte keine Regel: `belegvermerkImHinweis`.

Offen: Der Sammler `observed` für TV-Folgen ab 11 (tv.de) liegt hinter dem Plan zurück; ob er ungesichtete Tage nachzieht, ist nicht Teil dieses PR. Fällt ein Sendetag aus (Fußball), muss `skipDates` von Hand nachgetragen werden — wie bisher am 13. und 17.11.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
