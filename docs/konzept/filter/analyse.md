# Filterkonzept, Teil 1: Analyse (22.11.2026)

Schritt 1 von 3. Anlass (Daniel, 22.11.2026): (1) Datenbank, Schnellfilter „Disc“ auf ausschließen: „Yaiba: Samurai Legend“ (2025) verschwindet, obwohl es als Stream (Joyn) und im TV läuft. (2) Das Auge „im Handel“ im Kalender setzt den Disc-Ausschluss auch für die Datenbank. Daniel will die Filter von Kalender und Datenbank getrennt.

Belege: Code-Stand `36c6d22a`, Datensatz `public/data/*.json` vom 22.11.2026 (2.926 Titel in `titles.json`, 923 Releases, 4.638 Termine). Messskripte lagen im Scratchpad und sind im Abschnitt „Messweg“ beschrieben. Ist-Bilder: [ist/](ist/) (32 PNG: Handy 390 × 844 und Desktop 1600 × 900, hell und dunkel; die Cover laden offline nicht, sichtbar als leere Flächen).

## 1. Wie die Filter heute gebaut sind

**Zwei Ebenen werden vermischt.** Ein Titel (Anime) hat mehrere **Wege** (Releases: Plattform + Art + Status + Jahr; Streams; Kauflinks). Manche Filter beschreiben den Titel (Genre, FSK, Herkunft, Wertung, Cartoon, Favorit, kostenlos), manche einen Weg (Plattform, Art, Status, Jahr, „bestätigt“, TV, Zweitanbieter).

| | Kalender (`releaseMatches` je Release, dann Termine) | Datenbank (`passtTitel` je Titel) |
|---|---|---|
| Einheit | Release/Termin | ganzer Titel |
| Ausschluss einer Wegeigenschaft | blendet **den Release** aus (richtig) | wirft **den Titel** raus, sobald irgendein Weg die Eigenschaft hat (Yaiba-Fehler) |
| Einschluss mehrerer Wegeigenschaften | gilt für denselben Release (richtig) | jede Eigenschaft einzeln über alle Wege des Titels (falsch kombiniert) |

**Speicher und Adresse heute.**

- Datenbank: Listenfilter und Suche stehen in der Adresse (`p=`, `xp=`, `rt=`, `xrt=` …, `router.ts`).
- Kalender: Listenfilter nur im Speicher von `App.tsx` (`kalender-filter.ts`, seit 09.10.2026 getrennt, weil geteilter Zustand am Handy Fehler machte).
- **Aber die zehn Schnellfilter sind Geräte-Vorlieben** (`vorlieben.ts`, ein localStorage-Eintrag `vorlieben`): Favoriten, kostenlos, bestätigt, verfügbar, Disc aus und je ihr „aus“-Gegenstück, Zweitanbieter. `parseHash` füllt sie in **beide** Ansichten (`router.ts` Z. 132–150), `schreiber()` schreibt jede Änderung zurück (`vorliebenNachfuehren`). TV-Aus liegt extra in `tvAus` und wirkt nur im Kalender.
- Folge: Das Auge im Kalender-Bereich „Im Handel“ (`BereichAuge`, `schnellSetzen(…,'disc','nein')`) ändert `discAus` und damit die Datenbank. Gleiches gilt für Favoriten, kostenlos, bestätigt, verfügbar. `kalenderBasis()` zählt sie sogar in der Kalender-Filterzahl mit, auch wenn sie dort keine Wirkung haben (`verfügbar`, siehe 3.6).

Ist-Bilder dazu: `*-7-kalender-disc-aus` und `*-8-datenbank-erbt-disc-aus` (Disc im Kalender aus, Datenbank zeigt den Zustand geerbt).

## 2. Messungen am Datensatz

### 2.1 Der Yaiba-Fall und seine Klasse

„Yaiba: Samurai Legend“ (`id 177476`): Releases `disc/disc ×2`, `joyn/weekly`, `tv/weekly`; Stream `joyn`. Bestätigt im Ist-Bild `handy-hell-6-yaiba-disc-ausgeschlossen`: Mit Disc aus fehlt der Titel, Suchhinweis „14 Treffer ohne Synchro“ statt einer Erklärung.

Betroffen ist **jeder Ausschluss einer Wegeigenschaft** in der Datenbank, nicht nur Disc (`filters.ts` Z. 513–520, 506–507):

| Ausschluss | Titel, die heute zu Unrecht verschwinden (haben noch einen anderen Weg) |
|---|---|
| Disc | 142 (alt 2.738 Treffer, richtig 2.880) |
| Plattform Prime Video | 443 |
| Crunchyroll | 349 |
| Netflix | 166 |
| Disc als Plattform | 144 |
| ADN | 102 |
| Joyn | 66 |
| YouTube | 49 |
| RTL+ | 39 |
| Disney+ | 38 |
| TV | 21 |
| Art Wöchentlich | 68 von 241 Titeln mit dieser Art |
| Art Staffelpaket | 105 von 346 |
| Art Film | 90 von 743 |
| Art Disc | 113 von 188 |
| Status (`titleStatus` fasst alle Releases zu einem Wert zusammen, airing > tba > abgeschlossen) | 49 Titel haben mehrere Release-Status |
| Jahr | 92 Titel haben Releases aus mehreren Jahren |

Mehrfach-Zustände im Detail (Disc): 188 Titel mit Disc-Weg; davon **nur** Disc 32 (ohne Stream-Eintrag), Disc **und** andere Release-Art 81, Disc **und** Stream-Eintrag 140, Disc **und** TV 5 (alle fünf auch mit Streamplattform, also drei Zustände wie Yaiba). 107 Titel haben mehr als eine Release-Art.

### 2.2 Falsche Kombinationen beim Einschluss

Weil die Datenbank jede Eigenschaft über alle Wege eines Titels prüft, ergeben Kombinationen Treffer, die es als einen Weg nicht gibt:

| Kombination | Titel-Ebene heute | Derselbe Weg |
|---|---|---|
| Netflix + Disc | 22 | **0** |
| TV + Disc | 5 | **0** |
| Crunchyroll + Film | 115 | **0** |
| Netflix + Film | 79 | 6 |
| TV + Wöchentlich | 22 | 22 |

„Kostenlos“ hängt am Titel, nicht am Weg: 139 Titel sind kostenlos; die kostenlosen Wege liegen nur bei Joyn (51), YouTube (17) und Pluto TV (2). „Kostenlos + Netflix“ liefert heute **17 Titel**, ein kostenloser Netflix-Weg existiert **nirgends (0)**.

### 2.3 Zustände, Trefferzahlen, tote Filter

- **Datenbank gesamt:** 2.926 Titel; 2.227 haben keinen Release (davon 1.271 mit Stream-Eintrag), 1.150 gar keine Plattform. „verfügbar“: ja 1.935, nein 991. „kostenlos“: ja 139, nein 2.787. Status: erschienen 2.051, abgeschlossen 581, läuft 37, TBA 81, unbekannt 176. FSK unbekannt: 872 (Einschluss wirft sie raus, Ausschluss behält sie: unsymmetrisch).
- **„bestätigt“ in der Datenbank ist wirkungslos:** `confirmedOnly`/`confirmedExcluded` werden nur in `releaseMatches` ausgewertet (Kalender); `passtTitel` kennt sie nicht (Code-Beleg: `grep` über `web/src`, einzige Verwendung `filters.ts` Z. 338–339). Das Chip erscheint trotzdem im Datenbankfenster und zählt als Filter im Knopf.
- **„verfügbar“ im Kalender:** nicht im Fenster, aber als Geräte-Vorliebe gesetzt und in `kalenderBasis` mitgezählt, ohne Wirkung (`releaseMatches` kennt es nicht): Filterzahl am Knopf stimmt dann nicht.
- **Kalender-Fenster 16.11.–31.12.2026 (344 Termine):** TV 108, Disc 79 (23 %), Crunchyroll 80, Joyn 18, Prime 26, Netflix 25; „bestätigt“: 294 belegt, 50 geschätzt; Zweitanbieter 4; Cartoon im Gesamtbestand der Termine 39. Der Disc-Anteil erklärt, warum „Handel ausblenden“ im Kalender gebraucht wird, und es zeigt, dass Zweitanbieter mit 4 Terminen ein sehr schmaler Filter ist.
- **Jahr im Kalender:** Der Filter prüft `release.year` (Startjahr). 243 von 4.638 Terminen liegen in einem anderen Jahr als dem ihres Release: „Jahr 2027“ blendet im Januar 2027 laufende Serien mit Start 2026 aus; die Jahrwahl widerspricht der gewählten Woche. Der Filter ist im Kalender überflüssig, weil die Ansicht schon einen Zeitraum hat.
- **Datenbank: ein Titel mit `format: MOVIE` und Serien-Release:** 53 Titel. „Film ausschließen“ wirft sie ganz raus (Sonderfall seit 03.09.2026), „Serie“ gibt es nicht als Filter, nur „Film“.

### 2.4 Messweg

Skripte (im Scratchpad, nicht im Repo, Wegwerf nach Regel 60) rechnen `filters.ts` auf `titles.json`/`releases.json`/`events.json` nach (`titleStatus`, `kostenloseFolgen` aus `shared/`), Stichtag 22.11.2026. Die Umsetzung (Plan, Schritt 2) legt daraus einen Test an, der dieselben Zahlen als Erwartung festhält.

## 3. Kritik je Filter und Zustand

Zustände: **aus**, **einschließen** (nur das), **ausschließen** (das nicht). Urteil: ✔ sinnvoll, ◐ nur mit Änderung, ✘ entfernen. „Weg“ meint die Ebene aus Abschnitt 1.

### 3.1 Kalender

Zweck des Kalenders: Was erscheint wann, wo ich es sehen kann. Nutzer sind Fans, die ihre Woche planen. Alles ist Termin-Ebene.

| Filter | Bedeutung, Nutzer | einschließen | ausschließen | Urteil |
|---|---|---|---|---|
| Favoriten | „Nur meine Serien“, der häufigste Kalenderfilter, nahe am Zweck (Abo, Push) | ✔ | ✘ „meine Favoriten ausblenden“ hat im Kalender keinen Anlass | **2 Zustände** |
| TV (Plattform und Schnellchip) | Fernsehtermine sind 108 von 344 Terminen und für viele Lärm | ✔ (nur TV) | ✔ (TV ausblenden, Premieren bleiben, `tvSichtbar`) | 3 Zustände, aber **ein** Bedienelement: heute doppelt (Schnellchip TV **und** Plattformchip „TV 65“, E5) |
| Disc / „im Handel“ | 23 % der Termine; wer nur streamt, will sie weg; wer sammelt, will nur sie | ✔ | ✔ **Terminebene, richtig umgesetzt** | 3 Zustände; Schalter gehört dem Kalender allein |
| Plattformen (Chips mit Zahl) | „Wo schaue ich?“ | ✔ (mehrere: ODER) | ✔ („nicht Crunchyroll“, wer nur Netflix hat, kann auch einschließen) | 3 Zustände, ✔ |
| Art (Wöchentlich, Staffelpaket, Film, Disc) | Folge vs. Paket vs. Kino | ✔ | ✔ | 3 Zustände; gehört unter „mehr“, Disc steht schon als Schnellchip |
| bestätigt | „nur belegte Uhrzeit/Tag“ (294 gegen 50 im Fenster) | ✔ | ✘ (nur geschätzte zeigen: kein Anlass) | **2 Zustände** |
| Zweitanbieter | spätere Anbieter derselben Folge ausblenden (4 Termine) | – | ✔ | **1 Zustand**, besser als Schalter in „Anzeige“ statt Schnellchip |
| kostenlos | „Was gibt es ohne Abo?“ | ✔ | ✘ (nur Bezahl: kein Anlass, `Netflix` einschließen leistet das) | **2 Zustände**, aber auf **Weg**-Ebene (siehe 4.2) |
| Cartoon | Anime-Fan: Cartoons ausblenden; Cartoon-Fan: nur Cartoons | ✔ | ✔ | 3 Zustände; im Kalender 39 Termine |
| Genre, Schlagwort | Geschmack | ✔ (Genre UND, Voreinstellung) | ✔ (Ecchi, Standard-Ausschluss `ohneEcchiGenre`) | 3 Zustände, ✔ |
| FSK | Eltern, Jugendschutz | ✔ | ◐ besser „bis FSK x“ statt Mehrfachwahl; 872 Titel ohne FSK brauchen ein eigenes „unbekannt“ | 2 Zustände + „unbekannt“ |
| Herkunft | Land des Titels | ✔ | ✔ | 3 Zustände |
| Status (läuft, TBA …) | im Kalender die Frage „läuft das noch?“ | ◐ nur auf **Release**-Ebene | ✘ (mit 5 einwertigen Werten ist „nicht X“ = „eines der übrigen“) | **2 Zustände** |
| Jahr | im Kalender Doppelung des Zeitraums, widersprüchlich (2.3) | ✘ | ✘ | **entfernen** |
| Wertung | Qualitätsfilter | ✔ (Schwelle) | – | ✔ (kein Dreizustand), im Kalender selten gebraucht, hinter „mehr“ |
| Suche | im Kalender nicht vorhanden | – | – | ✔ so lassen: Suche führt in die Datenbank |

### 3.2 Datenbank

Zweck der Datenbank: Gesamtüberblick, auch ohne anstehenden Termin; „Wo und was gibt es?“. Nutzer entdecken, suchen, prüfen die Synchro. Einheit ist der Titel, **gezeigte** Wege sind die Karten-Zeile (Plattformen, Disc-Badge).

| Filter | Bedeutung | einschließen | ausschließen | Urteil |
|---|---|---|---|---|
| Favoriten | „Nur meine“ / „noch nicht gemerkt“ (Entdecken) | ✔ | ✔ **hier** sinnvoll (Entdecken) | 3 Zustände |
| verfügbar | „Kann ich streamen?“ (nicht Disc/Kino): 1.935 ja | ✔ | ◐ „nicht streambar“ (991: Disc, nur angekündigt) ist für Sammler brauchbar, aber als eigener Name | 3 Zustände, Beschriftung „streambar“ statt „verfügbar“ (Daniel hat den Namen am 15.08.2026 schon einmal geklärt) |
| kostenlos | 139 Titel | ✔ | ✘ | **2 Zustände**, Weg-Ebene |
| bestätigt | im Datenbankfenster **wirkungslos** | ✘ | ✘ | **entfernen** (in der Datenbank gibt es keinen Termin zu bestätigen; die Frage der Datenbank heißt Vertrauensstufe der Synchro, `minConfidence`, und ist ein anderer Filter) |
| Disc | Kaufmedium | ✔ | ✔ **aber nur auf Weg-Ebene** (Yaiba) | 3 Zustände, Weg-Ebene |
| TV | 22 Titel mit TV-Weg | ✔ | ✔ Weg-Ebene | gehört in Plattform, nicht als Schnellchip in der Datenbank (dort fehlt er heute auch) |
| Plattformen | Wo gibt es das? | ✔ | ✔ Weg-Ebene („ohne Prime“ = zeigt Titel ohne Prime **und** blendet Prime-Wege auf der Karte aus) | 3 Zustände |
| Art | Folge/Paket/Film/Disc | ✔ Weg-Ebene | ✔ Weg-Ebene | gleiche Regel |
| Film/Serie | Werk-Format | ✔ | ✔ (Film aus = Serien) | 2 Wahlfelder statt Zyklus; heute nur „Film“ und „Serie“ |
| Cartoon | 0 im Hauptbestand (`titles.json`), Cartoons kommen aus `cartoons.json` | ✔ | ✔ | 3 Zustände |
| Genre, Schlagwort | wie Kalender | ✔ | ✔ | 3 Zustände |
| FSK, Herkunft | wie Kalender | ✔ | ✔ | wie Kalender |
| Status | Titelstatus (aus Releases abgeleitet) | ✔ | ✘ | **2 Zustände**; bei mehreren Release-Status zählt „irgendein Weg erfüllt“ (Einschluss), keine Ausschlussregel |
| Jahr | Erstveröffentlichungsjahr (`jpYear`) oder Release-Jahr (`yearsOf`) wird gemischt: Titel mit Release → Release-Jahre, ohne → `jpYear` | ◐ klar machen, welches Jahr | ✘ | **2 Zustände**, ein Jahr („Erstausstrahlung“) als Hauptsinn, Release-Jahr nicht anbieten |
| Wertung | Schwelle, „ohne Wertung ausblenden“ | ✔ | – | ✔ |
| Synchro-Vertrauen | `minConfidence`, nur Datenbank | ✔ | – | ✔ |
| Sprecher | UND/ODER-Sonderregel | ✔ | ✔ | wie heute |
| „Anime ohne deutsche Synchro“, „Staffeln zusammenfassen“ | **Anzeige**-Schalter, keine Filter | – | – | aus dem Filterfenster in die Ansichtsleiste (4.4) |

### 3.3 Was bedeutet „Disc ausschließen“, und wer will das?

Wer ausschließlich streamt oder fernsieht, will keine Kaufmedien. Der Sinn von „ausschließen“ ist: **ich sehe keine Disc-Einträge**. Das heißt nicht „ich sehe keinen Titel, der auch auf Disc erscheint“. 142 solcher Titel verschwinden heute. In der Datenbank gibt es drei Lesarten:

1. Titel mit Disc-Weg ausblenden (heutige Umsetzung): falsch, weil der Titel auch Streams hat.
2. **Disc-Wege ausblenden (richtig):** Titel bleibt, wenn er noch einen anderen Weg hat; die Karte zeigt kein Disc-Badge; ein Titel, dessen einziger Weg Disc ist (32 Titel), entfällt.
3. Nur Titel zeigen, die **keinen** Disc-Weg haben (strenge Lesart): „kein Disc“ ist keine Frage, die jemand stellt.

Die richtige Lesart ist **2**, und sie gilt gleich für Plattform, Art, Status, kostenlos.

### 3.4 Kombinationen, Widersprüche, leere Ergebnisse

| Kombination | Heute | Befund |
|---|---|---|
| Plattform + Art | Datenbank prüft getrennt | 22 Titel „Netflix + Disc“, die es als Weg nicht gibt |
| kostenlos + Plattform | getrennt | „kostenlos + Netflix“ 17 Titel ohne kostenlosen Netflix-Weg |
| Status + verfügbar | verfügbar prüft Stream-Weg, Status prüft aggregierten Titelstatus | möglich „läuft (TV) + streambar“ trifft einen Titel, der nur im TV läuft und woanders ältere Folgen streamt; kein Fehler, aber nicht dasselbe Weg |
| Favoriten + Ausschluss | Favoriten schlägt nichts; Ausschluss gilt auch für Favoriten | „Disc ausschließen“ blendet einen **Favoriten** aus, der auch auf Disc erscheint (Yaiba kann Favorit sein); Favoriten sollten bei Titel-Ausschluss nicht verschwinden, bei Weg-Ausschluss bleiben sie ohnehin |
| Genre „und“ + mehrere Genres | Voreinstellung UND | schnell leer, Hinweis fehlt (Leerzustand nennt den Filter nicht, E6) |
| FSK + FSK unbekannt | Einschluss wirft 872 raus | unsichtbar für den Nutzer |
| Einschluss und Ausschluss derselben Sache | `toggleFilter` räumt die Gegenseite auf | ✔ keine Widersprüche |
| Kalender: Jahr + Zeitraum | siehe 2.3 | echter Widerspruch |

Leerer Zustand: Die Datenbank nennt bei leerer Liste nur den Suchhinweis („Anime ohne deutsche Synchro zeigen“), nicht, **welcher Filter** die Treffer nimmt (Regel E6, `design-regeln.md` Abschnitt 13).

## 4. Konzept

### 4.1 Grundregeln (Best Practice, kurz begründet)

1. **Ausschließen wirkt auf die Ebene des Filters.** Titel-Filter (Genre, FSK, Herkunft, Cartoon, Wertung, Favorit) entscheiden über den Titel; Weg-Filter (Plattform, Art, Status, kostenlos, TV, Disc) entscheiden über **Wege**; ein Titel bleibt, solange mindestens ein Weg übrig ist (oder er von Haus aus keinen hat). Das ist die Facettenlogik, in der eine Facette „ihre eigenen Werte ausnimmt, aber die anderen anwendet“ ([Zählung je Facette, Backend-Essay](https://alivedise.github.io/backend-engineering-essentials/search/faceted-search-and-filtering); [Algolia, Filter-UX](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/)).
2. **Mehrere Weg-Filter gelten für denselben Weg.** „Netflix + Film“ heißt: ein Netflix-Weg, der Film ist.
3. **Nur Zustände anbieten, die jemand braucht.** Ein Zustand, der nie etwas Sinnvolles liefert, ist Rauschen („fewer filters than you think“, [Doofinder](https://www.doofinder.com/en/blog/faceted-search)); die Code-Kommentare in `filters.ts` halten dasselbe seit 02.09.2026 fest („ein Schalter, der garantiert nichts findet, ist schlimmer als keiner“).
4. **Zahlen an jeder Option, Null-Optionen abblenden** ([Baymard, Trefferzahl an Filteroptionen](https://baymard.com/guidelines/467-indicating-the-number-of-matches-for-filtering-options); [Shopify, Zählung und leere Werte](https://shopify.dev/themes/navigation-search/filtering/storefront-filtering/storefront-filtering-ux)). Heute hat nur der Kalender Zahlen (TV 65, Crunchyroll 14 …), die Datenbank nicht.
5. **Gesetzte Filter sind sichtbar, einzeln entfernbar und werden nicht vergessen** ([Baymard, angewandte Filter](https://baymard.com/blog/how-to-design-applied-filters)): am Handy stehen sie heute nur im Fenster; ein Badge mit einer Zahl sagt nicht, was gesetzt ist (Ist-Bild `handy-hell-6`: „Filter 1“, Datenbank-Liste ohne Hinweis auf Disc).
6. **Ein Leerzustand nennt den Filter, der die Treffer nimmt, und bietet den Weg zurück** (Projektregel E6; [Baymard](https://baymard.com/research-articles/how-to-design-applied-filters)).
7. **Nichts doppelt** (Projektregel E5): TV nur als Plattform; Art-Disc und Schnellchip Disc sind eins.
8. **Ansicht ist kein Filter:** „ohne Synchro zeigen“, „Staffeln zusammenfassen“, Sortierung stehen in der Ansichtsleiste, nicht im Filterfenster.
9. **Handy: Filter werden im Fenster gesetzt, ein sichtbarer Knopf nennt die Trefferzahl** (Baymard: „Show X Results“, Sticky-Knopf; [Mobilfilter](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/filtering-options)). Heute zeigt das Fenster „Fertig“ ohne Zahl.

### 4.2 Weg-Ebene in der Datenbank

Ein Weg ist ein Release (Plattform, Art, Status, Jahr, geschätzt) oder ein Stream-Eintrag (Plattform, Zugang kostenlos/Abo) oder ein Kauf-/Anschaulink. Die Ebene gilt für: Plattform, Anbieter, Art, Status, kostenlos, verfügbar/streambar, Disc, TV. Streams ohne Release haben keine Art: sie bestehen jeden Art-Ausschluss, scheitern an jedem Art-Einschluss.

Ein Titel mit Weg-Filter bleibt sichtbar, wenn mindestens ein Weg alle Einschlüsse erfüllt und keinen Ausschluss trifft; Titel ganz ohne Weg (1.150 ohne Plattform) fallen bei Ausschlüssen nicht heraus, bei Einschlüssen schon. Die **Karte zeigt nur die Wege, die den Filter bestehen** (Yaiba: Joyn + TV, kein Disc-Badge).

### 4.3 Trennung Kalender und Datenbank

| | Kalender | Datenbank |
|---|---|---|
| Speicher | `localStorage` Schlüssel `ak.filter.kalender` (Gerät, dauerhaft; Schnellfilter, Plattformen, Art, TV, Genre …) | Adresse ist die Wahrheit (teilbar); zusätzlich `sessionStorage` `ak.filter.datenbank` für „Zurück in die Datenbank am selben Tag“ |
| Adresse | keine Filter (Ausnahme: veröffentlichte Push-Links `fav=1`) | alle Filter inkl. Schnellfilter (`fav=1`, `frei=1`, `xrt=disc` …) |
| Gemeinsam | nur die **Favoriten selbst**, Sprache, Theme; „Meine Anbieter“ (Wunschliste der Abos, `meineAnbieter`) als Hilfsliste für beide, nicht als Filterzustand | dasselbe |
| Push-Worker | benutzt `terminFilter` aus dem **Kalender**-Speicher | nie |

Heute ist der Schnellfilter-Zustand ein gemeinsamer Geräte-Eintrag; er wird je Ansicht **neu** angelegt (Migration im Umsetzungsplan).

### 4.4 Darstellung und Design: Schwächen und Verbesserungen

Befunde aus den Ist-Bildern (Handy 390 × 844, Desktop 1600 × 900; Maßstab `design-regeln.md` Abschnitt 13):

1. **Der Schnellfilter-Block ist farbig hinterlegt, der Rest nicht** (blaue Fläche hell, E9 Ein Muster). Zwei Hintergründe in einem Fenster, die wie ein zweiter Abschnitt „Aktionen“ wirken. *Verbesserung:* einfarbig, Gruppen durch Linien und Überschriften trennen wie die übrigen Bereiche.
2. **Das Fenster mischt Filter und Anzeige** (Handy: „Anime ohne deutsche Synchro“ und „Staffeln zusammenfassen“ zwischen Schnell und Plattform; Desktop: über der Liste). *Verbesserung:* beides in die Ansichtsleiste (E4: Häufiges zuerst), im Fenster nur Filter.
3. **Der Filterknopf zeigt nur eine Zahl.** Datenbank Handy: „Filter 1“ bei Disc aus, die Liste darüber nennt nichts. *Verbesserung:* aktive Filter als entfernbare Chips direkt unter der Leiste (horizontal scrollbar, höchstens eine Zeile am Handy; 44 px Tippfläche) und Fenster mit „N Titel zeigen“ statt „Fertig“.
4. **Dreizustandschip ohne Beschriftung der Richtung.** Zyklus nichts → ✓ → ⊘; der Name nennt den Zustand nur für Screenreader. *Verbesserung:* wo ein Filter nur 2 Zustände kennt (Favoriten im Kalender, bestätigt, kostenlos, Status, Jahr), genügt ein Ein-Aus-Chip ohne ⊘; wo 3 gelten, steht der Ausschluss als ⊘ **und** Durchstreichung (ist heute so, Beibehalten) plus kurzer Hinweis „Tippen: nur · nochmal: ohne · nochmal: aus“ einmalig im Fenster.
5. **Doppelte Bedienelemente:** TV als Schnellchip und Plattformchip im Kalender; Disc als Schnellchip, Art-Chip und Auge am Bereich „Im Handel“. *Verbesserung:* jeder Zustand hat **eine** Stelle im Fenster; das Auge am Bereichskopf bleibt (direkter Griff), zeigt aber den Zustand des Kalenders und sagt dazu „nur im Kalender“ (Tooltip), damit klar ist, dass die Datenbank unberührt bleibt.
6. **Die Datenbank hat keine Zahlen an Chips** (Kalender: „TV 65“). *Verbesserung:* Zahlen aus dem aktuellen Ergebnis ohne die eigene Facette (Regel 4.1.4).
7. **Desktop: schwebende Pille unten rechts, Fenster verdeckt die Liste** (`desktop-hell-4`). Die Filter am Desktop sind nicht dauerhaft sichtbar; wer filtert, verliert das Ergebnis aus dem Blick. *Verbesserung:* am Desktop (ab 1280 px) die gewählten Chips und die Trefferzahl in der Kopfzeile der Liste immer anzeigen; das Fenster bleibt für die Auswahl.
8. **Leerer Zustand.** Er nennt den Filter nicht (E6). *Verbesserung:* „Kein Treffer: Disc ausgeschlossen · Genre ‚Fantasy‘ und ‚Ecchi‘ … [Filter lösen]“.
9. **Handy-Tippflächen** sind 44 px (Hinweis in `ansicht-filterfenster.mjs` stimmt, Chips 32 px Box mit 44 px Trefferfläche): beibehalten.
10. **Tokens:** `slate-` in `FilterDetails.tsx` (`ModusSchalter`: `bg-slate-800/70`) ist eine alte Farbklasse; neuer Code nimmt `ak-*`.

### 4.5 Empfohlene Zustandsmatrix (Ergebnis)

| Filter | Kalender | Datenbank |
|---|---|---|
| Favoriten | aus · nur | aus · nur · ohne |
| kostenlos (Weg) | aus · nur | aus · nur |
| streambar (statt „verfügbar“) | – | aus · nur · ohne |
| bestätigt | aus · nur | **entfällt** |
| Zweitanbieter | Schalter „ausblenden“ | – |
| Plattform, Anbieter, Art (Disc, TV eingeschlossen) | aus · nur · ohne | aus · nur · ohne (Weg-Ebene) |
| Cartoon | aus · nur · ohne | aus · nur · ohne |
| Genre, Schlagwort, Herkunft | aus · nur · ohne | aus · nur · ohne |
| FSK | aus · nur (+ „unbekannt“) | aus · nur (+ „unbekannt“) |
| Status | aus · nur (Weg) | aus · nur |
| Jahr | **entfällt** (Zeitraum der Ansicht) | aus · nur (Erstausstrahlung) |
| Wertung, Synchro-Vertrauen, Sprecher | Wertung | alle drei |

## 5. Top-5-Verbesserungen für Vorher/Nachher-Bilder

1. **Yaiba bleibt:** Datenbank, Suche „Yaiba“, Disc ausgeschlossen. Vorher `ist/handy-*-6-yaiba-disc-ausgeschlossen.png` (Titel fehlt), nachher: Karte mit Joyn + TV, ohne Disc-Badge.
2. **Getrennte Filter:** Kalender mit Disc-Auge zu, danach Datenbank. Vorher `ist/*-8-datenbank-erbt-disc-aus.png`, nachher: Datenbank ohne Disc-Ausschluss, Auge im Kalender zeigt „nur im Kalender“.
3. **Aktive Filter sichtbar, Leerzustand nennt den Filter:** Datenbank Handy mit zwei Filtern; Vorher `ist/handy-*-4-datenbank-filterfenster.png` und `ist/*-6-*`, nachher: Chipzeile unter der Leiste und „Kein Treffer wegen …“.
4. **Weniger, klarere Zustände und eine Stelle je Sache:** Filterfenster ohne farbige Schnellfläche, ohne doppeltes TV/Disc, Ansichtsschalter in der Leiste. Vorher `ist/*-2-kalender-filterfenster.png`, `ist/*-4-datenbank-filterfenster.png`.
5. **Zahlen und „N Titel zeigen“:** Datenbank-Filterfenster mit Zahlen an Chips und Knopf mit Trefferzahl; Vorher `ist/desktop-*-4-datenbank-filterfenster.png`.

## 6. Überlegungen (für das Mockup)

- **Ausschließen heißt: diese Einträge nicht sehen, nicht: diese Anime nicht sehen.** Das ist der Satz, der Yaiba löst und den das Mockup zeigen soll (Karte vorher: weg; nachher: da, ohne Disc).
- **Kalender und Datenbank beantworten verschiedene Fragen.** Der Kalender fragt „was kommt wann“ und darf radikal filtern (Handel aus, TV aus); die Datenbank fragt „was gibt es“ und soll nichts von dem erben, was ich mir im Kalender eingerichtet habe.
- **Drei Zustände nur dort, wo beide Richtungen Sinn haben.** Plattform, Art, Genre, Cartoon, Favoriten (Datenbank): ja. bestätigt, kostenlos, Status, Jahr, Wertung: nein.
- **Ein toter Filter ist schlimmer als keiner.** „bestätigt“ in der Datenbank und „verfügbar“ als geerbte Vorliebe im Kalender zählen mit, tun aber nichts.
- **Zahlen und Sichtbarkeit statt Raten:** Wer Chips tippt, soll vorher sehen, was dabei herauskommt, und danach, was gerade gilt.
- **Offene Frage an die Umsetzung, nicht an Daniel:** Ob die Datenbank ihren letzten Filterstand dauerhaft (localStorage) oder nur je Sitzung merkt; Empfehlung Sitzung, weil die Adresse die geteilte Wahrheit ist und Daniel am 02.10.2026 nur „Disc ausblenden“ als Vorliebe vermisste, nicht den ganzen Datenbankstand.

## Quellen

- Baymard: [Trefferzahl an Filteroptionen (Guideline 467)](https://baymard.com/guidelines/467-indicating-the-number-of-matches-for-filtering-options), [angewandte Filter](https://baymard.com/blog/how-to-design-applied-filters), [Filter am Handy](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/filtering-options)
- [Shopify, Storefront-Filter-UX](https://shopify.dev/themes/navigation-search/filtering/storefront-filtering/storefront-filtering-ux)
- [Algolia, Search Filter UX](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/)
- [UXmatters, Faceted-Filter, Undo](https://www.uxmatters.com/mt/archives/2009/09/best-practices-for-designing-faceted-search-filters.php)
- [Doofinder, Faceted Search](https://www.doofinder.com/en/blog/faceted-search)
- Zu Include/Exclude-Chips (Tri-State) fand die Suche weder bei Baymard noch bei NN/g eine Aussage; die Empfehlung „nur wo sinnvoll“ ist eine Eigenfolgerung aus den Messungen oben.
