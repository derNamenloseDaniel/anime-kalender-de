<!-- titel: fix(wachen): selbstbestätigende Bestandswachen prüfen gegen den Vorstand -->
Auftrag: selbstbestaetigende-wachen

## Was

Sieben Bestandswachen hatten ein Soll, das derselbe Bau schreibt oder rechnet, den sie prüfen. Strich der Bau einen Eintrag aus Soll und Ist zugleich, blieben sie grün. Jetzt vergleicht jede zusätzlich mit dem **Vorstand**, dem zuletzt eingecheckten Stand (`HEAD`; im Bestandsbau also origin/main vor dem Commit, `--vorstand <ref>` wählt einen anderen). Rot ist ein **Abgang ohne Grund**: im Vorstand geführt, jetzt weder auf der Soll-Liste noch in der Ausgabe, obwohl die Sache noch da ist.

| Wache | Abgang ohne Grund (neu rot) | erklärt (grün) |
|---|---|---|
| `pipeline/check-cr-teilseiten-bestand.ts`, `pipeline/check-prime-teilseiten-bestand.ts` | Weg hatte Bereich oder Prüflisten-Eintrag, jetzt keins, Seite noch geteilt, Weg mit Ja | Weg weg, kein Ja, Seite nicht mehr geteilt |
| `pipeline/check-cartoon-staffeln-bestand.ts` | Cartoon hatte Staffeln oder Listeneintrag, jetzt keins | Cartoon nicht mehr im Bestand |
| `pipeline/check-cartoon-wege-bestand.ts` | Weg war je Staffel verteilt, jetzt weder verteilt noch gelistet | weniger als zwei Staffeln |
| `pipeline/check-cover-luecken-bestand.ts` | Kennung hatte überall ein Cover, jetzt irgendwo keins (die Lückenliste schreibt der Bau aus der Ausgabe) | Kennung nicht mehr im Bestand; neue Kennungen zählen nicht |
| `pipeline/check-adn-kennung-bestand.ts` | ADN-Show hatte Weg oder Termin, jetzt keins, Kalender des Sammlers führt sie noch | Show nicht mehr im Kalender |
| `pipeline/check-reihen-namen-bestand.ts` | aniSearch-Titel gehörte einer Reihe an, steht jetzt allein | Titel oder Wurzel nicht mehr im Bestand |
| `pipeline/check-remake-zaehlung-bestand.ts` | Neuverfilmung war markiert (`remakeVon`), jetzt nicht | ein Teil nicht mehr in den Reihen |

Gemeinsamer Baustein: `pipeline/lib/vorstand-abgang.ts` (Vorstand lesen, Abgang ohne Grund, Freigaben). Regeln je Wache: `pipeline/lib/teilseiten-vorstand.ts`, `pipeline/lib/cartoon-staffeln-vorstand.ts`, `pipeline/lib/cover-luecken-vorstand.ts`, `pipeline/lib/adn-kennung-vorstand.ts`, `pipeline/lib/reihen-namen-vorstand.ts`, `pipeline/lib/remake-vorstand.ts`. Ein nicht lesbarer Vorstand ist rot (Nichtauskunft ist kein „gleich“).

**Gewollte Regeländerungen:** Ein PR, der eine Bauregel bewusst so ändert, dass Einträge wegfallen, wäre gegen den Vorstand rot und danach jeder Bestandsbau. `VORSTAND_FREIGABEN` in `pipeline/lib/vorstand-abgang.ts` nimmt je Wache die Schlüssel heraus, die die Kette rot nennt; jede Abgangszeile sagt das. Nach dem ersten Bestandsbau mit der neuen Regel stehen sie nicht mehr im Vorstand und werden gestrichen.

Umbau getrennt: `refactor(wachen): Vorstand-Leser nimmt eine Wurzel`, `refactor(wachen): ADN-Kennungswache liest über ROOT` (Ausgabe vorher/nachher gleich, beide Exit 0).

Bestehende Kulissen-Tests ohne Git (`pipeline/check-cr-teilseiten-bestand-kulisse.ts`, `pipeline/check-cartoon-pruefregeln.ts`, `pipeline/check-cover-luecken-wache.ts`) legen jetzt einen leeren Commit an; ohne Bestandsdateien im Vorstand bleibt der neue Teil leer.

## Beleg

**Selbstbestätigungsfall je Wache, gegen die Basis rot, jetzt grün** (neu in `tools/check-logic-liste.txt`):

| Test | Basis (Wache von origin/main) | jetzt |
|---|---|---|
| `pipeline/check-teilseiten-vorstand.ts` | 8 von 14 rot | 18 grün |
| `pipeline/check-cartoon-staffeln-vorstand.ts` | 6 von 11 rot | 12 grün |
| `pipeline/check-cover-luecken-vorstand.ts` | 4 von 8 rot | 9 grün |
| `pipeline/check-adn-kennung-vorstand.ts` | 4 von 7 rot | 7 grün |
| `pipeline/check-reihen-namen-vorstand.ts` | 5 von 8 rot | 10 grün |
| `pipeline/check-remake-vorstand.ts` | rot (Modul fehlt) | 9 grün |
| `pipeline/check-vorstand-abgang.ts` | rot (Modul fehlt) | 14 grün |

Die Remake-Wache trägt feste Anlassfälle aus dem echten Bestand (Yaiba u. a.) und läuft nicht gegen eine Kulisse; ihr Test prüft die Vorstand-Funktion an einem Wegwerf-Repo und den Aufruf in der Wache.

**Verlaufsprobe vor dem Scharfschalten:** jede Regel an allen aufeinanderfolgenden Bestandsbau-Commits von origin/main ab 09.11.2026 (703 Bauten) gefahren:

| Regel | Treffer | Urteil |
|---|---|---|
| Cover | 1 (15.11., The Birth of Kitaro verliert das Plakat) | echter Fehler, genau der Anlass vom 16.11. |
| Teilseiten | zuerst 2 (16. und 17.11., SAO Alternative II, Dorohedoro: Seite nicht mehr geteilt) | Fehlalarm → Regel geschärft, danach 0 |
| Cartoon-Wege | zuerst 4 (11.11. zwei Titel verlassen die Liste ohne Ton je Staffel; 10.11. PR 3018) | 11.11. Fehlalarm → Regel geschärft; PR 3018 war eine gewollte Regeländerung → Fall für die Freigaben |
| Cartoon-Staffeln, ADN, Reihen (858 gruppiert), Remake (13 markiert) | 0 | — |

Am echten Bestand alle acht Wachen grün (Exit 0). `npx tsc --noEmit -p .` grün; berührte Tests (die Einheitenprüfungen `check-cr-teilseiten`, `check-prime-teilseiten`, `check-cartoon-staffeln`, `check-cartoon-wege`, `check-adn-kennung`, `check-reihen-namen`, `check-remake-zaehlung` und die oben genannten Kulissen-Tests) grün.

**Mutation** (`diff-mutanten`, letzter Lauf vor dem letzten Test-Commit): 398 Mutanten, 48 überlebt, 0 unbrauchbar. Danach den einen sachlichen Überlebenden (Cover: Hauptbestand im Vorstand nicht gelesen) mit einem Fall geschlossen und von Hand gegengeprüft (Mutant rot, 1 von 9).

| Datei | überlebt | Art | Urteil |
|---|---|---|---|
| `pipeline/lib/adn-kennung-vorstand.ts` | 13 | Rückfallwert bei fehlender Datei (`readJson`-Vorgabe, leerer Kalender), erste Zeile der Fehlermeldung, Kürzung der Liste auf 10 | Meldungstext/Fallback, keine Urteilsänderung |
| `pipeline/lib/cartoon-staffeln-vorstand.ts` | 8 | dieselben Arten; `?? 0` → `?? 1` bei `>= 2` | gleichwertig bzw. Meldungstext |
| `pipeline/lib/teilseiten-vorstand.ts` | 7 | dieselben Arten | Meldungstext/Fallback |
| `pipeline/lib/reihen-namen-vorstand.ts`, `pipeline/lib/remake-vorstand.ts` | 6 / 6 | dieselben Arten | Meldungstext/Fallback |
| `pipeline/lib/vorstand-abgang.ts` | 7 | `maxBuffer`/`windowsHide`/`stdio`; Vorgabe `wurzel = ROOT`; Vorgabe `freigaben` | `maxBuffer` nötig für den echten Bestand (titles.json 3,97 MB > 1 MB Vorgabe; die Wachen lesen ihn am echten Vorstand grün), Vorgabe `ROOT` fangen die Wachen-Prozesstests (nicht zugeordnet), Freigaben leer → gleichwertig |
| `pipeline/lib/cover-luecken-vorstand.ts` | 1 | Hauptbestand im Vorstand nicht gelesen | **geschlossen** (Commit „Coververlust eines Titels ohne Reihe“) |

## Annahmen

- Vorstand ist `HEAD`, nicht `origin/main`: Im Bestandsbau ist HEAD vor dem Commit gleich origin/main; in der PR-Kette ist HEAD der Merge-Ref, dessen Bestand der von main ist. So bleibt `--vorstand` für Probeläufe frei.
- Cover-Verlust ist **rot**, obwohl der Hauptbestand-Teil vom 16.11. nur warnt: Jener Teil warnt, weil neue aniSearch-Titel täglich ohne Bild kommen; die Vorstand-Regel zählt nur Kennungen, die ein Cover hatten (Verlauf: einziger Treffer war der echte Kitaro-Fehler).
- Nicht umgestellt: `check-anisearch-dubletten-bestand` (Soll ist eine Paarfindung, kein Bestand: Vorstand hilft nicht, nötig wäre eine Neufassung wie bei nur-omu), `check-cartoon-zwilling-bestand` (Vorstand-Regel wäre leer: 0 übernommene Anbieter an 21 Zwillingen, gemessen), `check-anisearch-katalog-abgleich-bestand` (teils, die Handliste deckt den Kern). Weitere Wachen derselben Bauart ohne Auftrag sind im Bericht gelistet.
- Keine Patch Notes: interne Änderung.

## Live-Beleg

entfällt (keine Datenkorrektur; wirkt im nächsten Bestandsbau, dort ist der Vorstand der eingecheckte Stand).

## Patch Notes

entfällt (intern).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zow26o7XmJEh3GfgbU
