# TBT-Bänder: Regression oder zu eng? (Auftrag tbt-baender-2411, 24.11.2026)

## Ergebnis

**Keine Regression an einem einzelnen Commit.** Die Grenzen sind zu eng, und dazu kommt eine langsame Drift. Der rote Nachlauf 45424597997 (`eda54153`, Titel TBT 1102 > 1100) lief auf einem Runner mit benchmark 2684/2771/2754. Der Median 2754 liegt 4 Punkte über der Bandkante, deshalb galt das Band „mittel“ (Grenze 1100). Bei 2749 hätte „langsam“ gegolten (Grenze 1610).

- **Daten:** 557 Lighthouse-Läufe mit Messwerten, 21.11. 01:37 bis 24.11. 15:21 UTC: 429 „Nachlauf – Budgets“ und 128 „PR-Aussehen – Lighthouse“. Grundlage sind die Einzelmessungen `Lauf n: {…}` aus den Job-Logs, Band nach dem Median-benchmark je Seite wie in `tools/lighthouse-urteil.mjs`. Lücken: 449 PR-Jobs ohne Lighthouse-Schritt (Umfang), 4 Nachlauf-Logs leer, 14 Job-Listen mit „Server Error“.
- **Überschreitungen:** 33 Seitenwerte in 27 Läufen über der Bandgrenze, davon 25 Nachläufe auf main. Allein Datenbank „mittel“ (Grenze 730) riss 18-mal, bei einem Bandmedian von 600 und p95 von 806. Die Grenzen vom 21.11. stammen aus höchstens 15 Läufen je Band (höchster Median × 1,15) und liegen damit mitten in der Verteilung: Datenbank mittel unter p95 (730 < 806), die übrigen Datenbank- und Titel-Grenzen zwischen p95 und Maximum.
- **Drift statt Sprung:** Im Band „langsam“ bleibt der Runner gleich (Median-benchmark 2488 / 2490 / 2488 / 2491 an den vier Tagen), trotzdem steigt TBT. Datenbank 964 → 1042 (+8 %), Titel 1185 → 1301 (+10 %), nur Nachläufe +5 bis +7 %. Die beste Zweiteilung nach der Zeit liegt in allen sechs Datenbank-/Titel-Reihen bei 22.11. 12:30 bis 23.11. 06:20 UTC, aber an verschiedenen Commits (`3d89bb08`, `8cea5a58`, `5a0dd02a`, `035a2244`, `39984ee0`, vier davon reine Datenbauten). Die Steigung ist gleichmäßig: 2,5–3,5 %/Tag, im Band mittel bis 5,9 %/Tag. Ein Sprung in einem gleichen Band lässt sich keinem Commit zuordnen. Der Kalender bleibt flach oder sinkt sogar (langsam 157 → 148).
- **Mögliche Ursachen, alle klein:** Das Startbundle `index-*.js` wuchs von 415,7 auf 424,7 kB roh (+2,2 %), JS gesamt von 821 auf 839 kB, `titles.json` von 3,92 auf 3,97 MB (+1,4 %, gzip 866 → 878 KB). Die Titel-Bytes (Minimum) stehen bei 3,32 MB. Jede dieser Größen erklärt allein nur einen Teil der +8 bis 10 %. Das Gesamtbild passt zu „mehr Code und Daten auf demselben langsamen Rechner“, eine einzelne lange Aufgabe ist nicht nachgewiesen.
- **Konstruktionsfehler der Bänder:** Die Runner bilden Gruppen (Titel-Seite) um benchmark 2300–2600 (n = 210), **2600–2850** (n = 62), 2900–3000 (n = 113), 3400–3500 (n = 93) und 3900–4400. Die Kante 2750 schneidet mitten durch die zweite Gruppe. Innerhalb des Bands mittel liegt der Teil 2750–2900 bei Datenbank 720 und Titel 956 (Median), der Teil 2900–3250 bei 589 bzw. 771. 45 Seiten-Messungen hatten Einzel-benchmarks auf beiden Seiten von 2750, 24 auf beiden Seiten von 3250. Ob ein Lauf rot wird, hängt dort am Zufall.

## Vorschlag (nicht umgesetzt; Analyst ändert nichts)

1. **Grenzen neu = p99 des Bands × 1,15**, aus allen 557 Läufen, auf 10 aufgerundet (Spalte „neu“). In der eigenen Stichprobe wäre 1 statt 27 Läufen rot gewesen (Kalender schnell 113 > 110). Gegenprobe außerhalb der Stichprobe: Mit Grenzen nur aus 21.–22.11. gelernt wären am 23.–24.11. 0 von 322 Läufen rot gewesen (Kante 2750, Faktor 1,15). Damit hätte die Regel **26 Fehlalarme seit 21.11.** verhindert, darunter 24 auf main. Die Datenbank-Grenze im Band mittel wird mit 980 locker (1,6 × Median), weil die Gruppe 2750–2900 mitzählt.
2. **Alternative mit schärferem Band mittel:** die Kante von 2750 auf **2870** legen (Lücke zwischen den Gruppen, 1–6 Läufe je 25 Punkte). Dann gelten im Band mittel Datenbank 950 und Titel 1160, und in der Stichprobe ist ebenfalls 1 Lauf rot. Außerhalb der Stichprobe wären es mit Faktor 1,15 2 von 322, mit Faktor 1,25 0. Ich empfehle Vorschlag 1 jetzt, weil er nur Zahlen in `tools/lighthouse-grenzen.mjs` ändert. Die Kante 2870 kommt dazu, sobald ein zweiter Wochensatz die Gruppen bestätigt.
3. **Drift eigens bewachen** statt über die Einzelgrenze: Der Wochenmedian der Nachläufe je Band soll gegen den Vorwochenwert stehen, Alarm ab +10 %. Bei 2,5–3,5 %/Tag frisst die Drift jeden festen Abstand in 2–3 Wochen. Ob sie sich fortsetzt, zeigt erst die nächste Woche: Am 24.11. flachen die Nachläufe ab (Datenbank langsam 1021 → 1014).

| Seite | Band | n | Median | p90 | p95 | max | Grenze alt | über alt | Median 21. → 22. → 23. → 24.11. | Grenze neu (p99 × 1,15) | über neu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Kalender | schnell ≥ 3250 | 169 | 56 | 71 | 76 | 113 | 100 | 2 | 60 → 65 → 50 → 54 | 110 | 1 |
| Kalender | mittel | 134 | 87 | 113 | 124 | 146 | 150 | 0 | 85 → 92 → 79 → 89 | 170 | 0 |
| Kalender | langsam < 2750 | 254 | 145 | 181 | 187 | 235 | 250 | 0 | 157 → 156 → 134 → 148 | 260 | 0 |
| Datenbank | schnell | 168 | 334 | 432 | 463 | 668 | 540 | 5 | 321 → 324 → 348 → 332 | 680 | 0 |
| Datenbank | mittel | 132 | 600 | 751 | 806 | 861 | 730 | 18 | 583 → 587 → 600 → 628 | 980 | 0 |
| Datenbank | langsam | 257 | 1008 | 1145 | 1187 | 1348 | 1320 | 1 | 964 → 963 → 1020 → 1042 | 1420 | 0 |
| Titel | schnell | 170 | 468 | 616 | 698 | 962 | 760 | 5 | 451 → 446 → 500 → 491 | 1090 | 0 |
| Titel | mittel | 129 | 792 | 930 | 987 | 1102 | 1100 | 1 | 731 → 751 → 837 → 862 | 1210 | 0 |
| Titel | langsam | 258 | 1267 | 1385 | 1421 | 1640 | 1610 | 1 | 1185 → 1239 → 1271 → 1301 | 1720 | 0 |

## Rückblick

- **Gut:** Job-Logs per `gh api repos/…/actions/jobs/<id>/logs` mit `xargs -P12` laden: rund 1000 Logs in wenigen Minuten. `gh api …/workflows/nachlauf.yml/runs?created=>=…` geht, `gh run list --workflow` nicht.
- **Schlecht:** Der Klon ist shallow (`git rev-parse --is-shallow-repository` = true). Ein `git log -- web/src` seit 20.11. zeigte deshalb nur Commits vom 24.11. Vor jeder Commit-Zuordnung zuerst `git fetch --shallow-since=<Datum> origin main` ausführen.
- **Unerwartet:** Der rote Lauf lag 4 benchmark-Punkte über der Kante, und dieselbe Seite hatte im selben Lauf Einzelwerte in beiden Bändern. Die Grenzen vom 21.11. stammten aus einer Stichprobe von 1,5 Tagen.
- **Vorschlag:** Die Grenzen nach Vorschlag 1 setzen (Bauer, Stufe 1). Den Satz „ein Lauf über der Band-Grenze ist ein Befund (Regression)“ in betrieb.md ersetzen durch „Grenze = p99 × 1,15 aus ≥ 100 Läufen je Band; Drift über den Wochenmedian“.
- **Veraltet:** In betrieb.md, Abschnitt „TBT auf den Runner normiert“, sind n = 15/24/29 und „Grenze = Mittel + 4,3 σ“ überholt, ebenso die Runner-Gruppen „2650–3050“: Sie sind zwei Gruppen, 2600–2850 und 2900–3000.
