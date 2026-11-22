# Cloud-Orchester — Nachtbetrieb mit Cloud-Sitzungen

Stand 22.11.2026, 02:00 UTC (erste und zweite Nacht, Auftrag Issue 4420). Alle Zeiten UTC, jede Dauer aus zwei GitHub-Zeitstempeln.
**Wann lesen:** bevor ein Orchester (Routine + Bauer-Sitzungen) wieder aufgesetzt wird oder Aufgaben nachts in die Cloud gehen.

## Ablauf

- **Orchestrator:** eine dauerhafte Cloud-Sitzung (Routine, stündlich geweckt). Er vergibt Aufgaben, liest Berichte und Prüfer-Urteile, nimmt ab und pflegt den Lage-Kommentar im Auftrags-Issue. Er baut nicht selbst.
- **Bauer:** je Aufgabe ein Agent in der Orchester-Sitzung (Agent-Werkzeug, `run_in_background`, `isolation: worktree`, Sonnet, höchstens 4 gleichzeitig; nicht per `create_session`, siehe „Ergänzungen und Bauer-Weg“; die ersten zwei Nächte liefen noch mit `create_session`). Jeder öffnet einen PR mit Label `orchester` und meldet sich mit `## Bauer fertig · <Aufgabe> · PR <N>` im Issue.
- **Prüfer:** die PR-Prüfkette (CI-Prüfer schreibt „Prüfer-Review“ als Kommentar). Stufe 0/1 mergt der Nacht-Merger nach Bot-„ok“; Stufe 2 nur mit `## Nachtrag (Abnahme Dirigent) — Kopf <9 Zeichen>` zum aktuellen Kopf; Workflow-PRs nur von Hand.
- **Wecken:** Ereignis-Monitor (Bash-Schleife, 120 s, gesehene IDs in einer Datei, Frist 30 min, bei jedem Wecken neu starten), dazu `ScheduleWakeup` 30 min als Rückfall und die stündliche Routine.
- **Schalter:** Label `orchester-aktiv` am Issue, geprüft vor jedem Schreiben.

## Ergebnis der ersten Nacht (bis 03:40)

- 22 Aufgaben: 1 lokal übersprungen, 1 übersprungen (Vorbedingung fehlt), 4 ohne Netz nicht machbar bzw. nur am Datenstand, 3 ohne PR erledigt (Messung/Prüfung), 15 PRs eröffnet.
- Gemergt durch den Nacht-Merger: PR 4426 (02:57:01), 4430 (02:57:36), 4433 (02:58:10), 4421 (03:18:45), 4425 (03:19:20), 4434 (03:36:27).
- Bauer-Laufzeiten (Sitzung angelegt → Bericht): schnellste 65 s (A2, Prüfaufgabe ohne PR), typische PR-Aufgabe 7–16 min (A19 02:17:43 → 02:25:00, A13 01:47:19 → 02:03:58), längste 52 min (A8 01:31:24 → 02:23:27, zwei gestapelte PRs, Warten auf die Kette).

## Nachtrag bis 05:30

- Gemergt: PR 4439 (Doku, 03:56:36). Bis 05:30 sonst nichts, weil alle übrigen offenen PRs Stufe 2 ohne Auflagen (Abnahme Dirigent), Workflow-PR (4422) oder „Dirigent entscheidet“ (4436) sind.
- Abnahmen des Orchesters mit eigener Gegenprobe: PR 4422 (7055993334), 4426 (7055763000, nach main-Nachzug erneut 7056190428), 4421 (7056238363, erneut 7056361601), 4444 (7057794930).
- Längste Bauer-Laufzeit: A16 86 min (02:59:08 → 04:25:16), davon ca. 25 min ein Kettenlauf, den eine Patch-Notes-Wortzahl kostete, und ein Konflikt nach dem Merge von PR 4434.
- Ein Bauer ging untätig, bevor er berichtete (A16, Sitzung ab 04:22:47 untätig, Bericht dann doch 04:25:16): Bauer-Sitzungen beenden den Turn, solange die Kette läuft; der Bericht kommt nur, wenn sie wieder geweckt werden.
- Wiedervorlage A2 nach dem Tageslauf (Lauf 44863889605, success 04:26:46): „offen“ blieb 4. Ursache: der Plausibilitäts-Riegel von „JustWatch frisch“ verwarf das ganze Ergebnis („11 von 36 Treffern ohne Angebot … nichts geschrieben“), weil Wiederfunde ohne Angebot als leer zählten. Fix PR 4444 (abgenommen). Lehre: Riegel und Nachfrage (PR 4318) nie zusammen probiert; ein neuer Nachfrageweg braucht einen Lauftest gegen den Riegel.

## Was gut lief

- Cloud-Sitzungen als Bauer starten zuverlässig in Sekunden; vier parallel ohne Störung.
- Der Briefkasten im Issue (Bauer-Kommentar + Monitor) weckte den Orchestrator jeweils binnen 2 min.
- Der CI-Prüfer arbeitet im Abnahme-Modus sauber: zweite Runde prüft nur die Auflagen der ersten.
- Bauer finden echte Befunde am Bestand (A8: Spur-Kopf zeigte bei 697 von 912 Reihen zu viel; A13: Ausbleiben-Entscheidung 9,7–15,2 ms Median statt ≤ 5 ms).

## Was schlecht lief — Hänger und Blockaden

| von – bis | Dauer | Ursache | Beleg |
|---|---|---|---|
| 01:28 – offen | ganze Nacht | Netz der Cloud-Umgebung „Default“ ohne erlaubte Hosts: `anime-kalender.de`, TMDB, Wikipedia, AniList, Anime2You gesperrt (Proxy 403). Live-Messungen (A1, A14, A17) und Belegarbeit (A10, A22, Rest A8/A15) unmöglich. | Issue 4420: 7055128590, 7055143077, 7055341471; Frage 7055163585 |
| 01:36:30 – 02:03:20 | ≥ 27 min | Uhrabhängiger Mod-Test `.claude/mods/arbeitsliste/hooks/anzeige.test.ts` („Pane: Bereiche zu zeigen nur den Kopf …“) macht „Kette – Workflows 2“ an jedem PR rot; Neulauf um 01:50:25 ebenfalls rot, um 02:03:20 grün ohne Änderung. Jeder betroffene PR kostete eine Prüfer-Runde. | Job-Log PR 4421; Lauf 44850953648; PR 4428 grün; Fragen 7055318561, Nachträge 7055455813, 7055631921 |
| 01:59 | – | Auflagen ließen sich nicht an denselben Bauer zurückgeben: `SendMessage` an eine Cloud-Sitzung wird abgewiesen („credential … only for its own work“). Ersatz: neue Sitzung auf demselben Zweig. | Orchestrator-Sitzung 01:59 |
| 02:22:41 – 02:28:34 | 6 min | Fehlalarm des Orchestrators: Gegenprobe mutierte die erste Textfundstelle (Z. 70, Altcode) statt Z. 158 → unnötige dritte Runde an PR 4422. | PR 4422: 7055852078, Korrektur 7055941229 |
| 02:35:38 – 02:55:38 | 20 min | Nacht-Merger mergt nicht, sondern zieht main (Bestandsbau adb5b4819) in die PRs nach; neue Köpfe brauchen neue Kette, Stufe 2 eine neue Abnahme. | Lauf 44856745580; Abnahmen 7056190428, 7056361601 |
| 04:26:46 – 05:16 | 50 min bis Fix-Abnahme, Wirkung erst 22.11. | Tageslauf schrieb wegen des JustWatch-Riegels nichts; offen 4 statt 1. | Lauf 44863889605; Bericht 7057595132; PR 4444 |
| 03:54:58 – 04:25:16 | 30 min | Ansichten-Messung „Filterfenster am Rechner“ bestand auf main nur durch Rundung (Scroller 403/401 px); +1 px kippte sie (PR 4436). | Urteil 7056913189, Bericht 7057243467 |
| 01:36 – 03:05 | – | „PR-Aussehen – Lighthouse“ streut bei den Titel-Bytes um > 1 MB (4395 KB gegen 3245 KB), Neustart grün. | PR 4423, Bericht 7055866603 |

## Zweite Nacht 21./22.11.2026 (bis 02:00)

**Umgebung:** eigene Cloud-Umgebung „nacht-orchester“ mit Netz zu `anime-kalender.de`, TMDB (ohne Schlüssel 401), AniList, de.wikipedia (drosselt mit 429), Anime2You, GitHub und npm. Nicht erreichbar: `amazon.de`, `aniverse.de`, `fsk.de` (403), `anisearch.de` (403).

**Ergebnis:**
- 19 PRs durch den Nacht-Merger gemergt (`merged_at`, 21.11. 22:36:31 bis 22.11. 01:57:12, im 20-min-Takt): 4512, 4510, 4515, 4517, 4518, 4520, 4521, 4523, 4524, 4525, 4522, 4526, 4527, 4519, 4529, 4531, 4532, 4534, 4536.
- Offen beim Dirigenten: 4509 (berührt `bestand-bauen.yml`, Frage 7070221945, A1–A7 erfüllt) und 4533 (Frage 7071452470: Jahresgrenze sortiert vor der Terminstufe, `tools/maengel.mjs:59`).
- Ohne PR: Aufgaben 2 Chrono Crusade (7070216249), 9 Bakugan (7070323940), 10 B-Daman (7070558106); Nachschub Abenteuer auf dem Eis (7071249907), Akito 1 (7071274337), Demon Slayer 142329 (7071694597), Date A Bullet 111852 (7071718314), Dusk 195153 (7071735219), Rockman.EXE AXESS (7071747174), Grisaia 120892 (7071760470).
- Blockiert: Aufgabe 18 und die Lehren zu 4510 (`daniel-zum-abarbeiten/berichte/lehren.md` liegt nicht im Repo).
- Gemessen (Aufgabe 19, Protokoll 7070875480, 7071550276, 7072206841): `laufzeit` 307 → 14 → 13 (Erwartung −155; 4512 wirkte mit), `sprecher` 370 → 371 → 373 (Sprecherlauf bis 01:25 ohne Wirkung). Aufgabe 21: Live-Anbieterzeile Pokémon Horizonte „Staffel 1–3 · Staffel 4 Fg. 1“ wie erwartet (Live-Daten `generatedAt` 23:40:20).

**Was gut lief:**
- Die eigene Umgebung hob die Netzsperre der ersten Nacht auf; die Datenaufgaben 1 und 3–8 lieferten PRs.
- Bauer-Sitzungen waren schnell: Datenaufgaben brauchten wenige Minuten bis zum Bericht (Peter Pan: Sitzung 22:27:55, Bericht 7070237337).
- Prüfer-Agenten für Gegenproben fanden echte Lücken: 4515 (überlebender Mutant `continue`), 4533 (Sortierung).

**Hänger:**

| von – bis | Dauer | Ursache | Beleg |
|---|---|---|---|
| 22:49 – 23:09 | 20 min | Fünf Daten-PRs ohne Patch-Notes-Eintrag, Kette rot; je eine Auflagen-Sitzung. | 7070437049, 7070451298, 7070459738 |
| ganze Nacht | – | Auflagen nicht an denselben Bauer zurückzugeben (`SendMessage` an Cloud-Sitzung abgewiesen); je Auflage eine neue Sitzung. | Protokoll 7070466502 |
| 22:52 | – | Eine Auflagen-Sitzung startete nicht; der Zweigname war geraten. | – |
| 23:48 – 00:14 | 26 min | PR 4531: Kette zweimal rot an Mutationslisten (Anker nicht gefunden; Mutanten ohne `tests` 107 > 101). | 7071125668, 7071242448 |
| 00:15 – 00:36 | 21 min | 4519 und 4522 DIRTY nach Merges; Bauer mergte main nach. | Merger-Lauf 44965743231, 7071563507 |
| 00:26 – 01:29 | 63 min | 4534: Auflage per PR-Kommentar ohne Commit erfüllt, daher kein neuer Prüfer-Lauf, letztes Urteil blieb „ändern“; Prüfer per Dispatch neu angestoßen. | Lauf 44971467170, Protokoll 7072206841 |
| 00:39 – 00:46 | 7 min | Nachschub aus `maengel --top`: 9 von 10 Versuchen ohne PR, weil Quellen gesperrt; Nachschub angehalten. | 7071704348, 7071770846 |

## Verbesserungsvorschläge

1. **Netz (erledigt, zweite Nacht: Umgebung „nacht-orchester“):** Für Nacht-Orchester eine eigene Cloud-Umgebung mit erlaubten Hosts (`anime-kalender.de`, `api.themoviedb.org`, `graphql.anilist.co`, …) und Setup-Skript `npm ci` anlegen; die Default-Umgebung hat keines, jeder Bauer verlor Zeit mit `npm ci`.
2. **Mod-Test:** Stempel in `anzeige.test.ts` aus fester Uhr bilden; `uhr-in-tests` auf `.claude/mods` ausdehnen (Vorschlag A8).
3. **Rückgabe an Bauer (seit 22.11.2026 umgesetzt):** Bauer als Hintergrund-Agent (Agent-Werkzeug) statt Cloud-Sitzung — dann geht `SendMessage` für Auflagen.
4. **Stufe 2 ohne Auflagen:** Der Orchester-Auftrag erlaubt Abnahme nur nach umgesetzten Auflagen; reine Stufe-2-PRs mit Bot-„ok“ (4415, 4423, 4424, 4427, 4428, 4435, 4438) bleiben bis zum Morgen liegen. Entscheiden, ob der Orchestrator sie nach eigener Stichprobe abnehmen darf.
5. **Reine Kommentar-PRs** in `pr-stufe` herabstufen (Vorschlag A21).
6. **Gegenprobe:** Mutanten nur per Zeilenanker setzen, nie per erster Textfundstelle.
7. **Monitor:** meldet `github-actions`-Kommentare; `## Frage`-Kommentare der Bauer meldet er nicht — mit aufnehmen.
8. **Patch-Notes-Pflicht** von Anfang an in jeden Daten-Auftrag schreiben (Hänger 22:49–23:09).
9. **Zweig der Auflagen-Sitzung** nur aus `pulls/<N> --jq .head.ref` nehmen, nie raten.
10. **Prüfer-Neustart**, wenn eine Auflage per Kommentar statt Commit erfüllt wird (`pr-pruefer-nachtrag.yml`, Job `neustart`).
11. **Nachschub** nur für Mängelarten mit erreichbarer Quelle; TMDB-Aufgaben über `claude-auftrag.yml` (die Umgebung hat keinen Schlüssel, siehe „Ergänzungen und Bauer-Weg“).
12. **Lehren-Aufgaben:** `lehren.md` ins Repo legen oder solche Aufgaben als „lokal“ markieren.
13. **Neue Mutanten** sofort mit `tests`-Eintrag anlegen (PR 4531).

## Ergänzungen und Bauer-Weg (22.11.2026)

- **Aufgabenliste:** der neueste `## Nachtrag (Nacht …)`-Kommentar an Issue 4420 plus alle späteren `## Ergänzung`-Kommentare. Das Orchester liest bei jedem Wecken alle Kommentare seit seiner Marke; sein Monitor meldet neue `## Ergänzung`/`## Nachtrag`-Kommentare. Eine Ergänzung mit VORRANG geht vor alle noch nicht vergebenen Aufgaben. Anlass: In der Nacht 21./22.11. blieben die Ergänzungen von 00:14/00:16 (Horizonte, Sitzungs-UI) bis zum Morgen liegen (Lehre 209).
- **Bauer nur als Agent:** das Orchester startet Bauer als Agent in seiner eigenen Sitzung (`run_in_background`, `isolation: worktree`), nie per `create_session`: jede so erzeugte Sitzung erscheint in Daniels Windows-Client (40 „bauer…“-Sitzungen am 22.11.2026). Der Remote-Konnektor ist seit 22.11.2026 aus der Routine entfernt.
- **Aufgaben mit TMDB:** die Cloud-Umgebung hat keinen TMDB-Schlüssel, das GitHub-Secret `TMDB_API_KEY` gibt es. Solche Aufgaben laufen per `gh workflow run claude-auftrag.yml` (Eingaben `auftrag`, `zweig`, `zweck`), der den Schlüssel als env setzt.
- **Nachschub** nur aus Mängeln, die aus der Cloud belegbar sind (aniSearch-Seiten, Amazon, FSK, aniverse sind remote gesperrt; 10 Versuche in der Nacht 21./22.11.2026 ergaben 1 PR).
