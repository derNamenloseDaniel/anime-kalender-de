# Prüftisch Durchlaufzeit, 24.11.2026

Erstprüfung, kein Vorbericht. Fenster 17.–23.11.2026 (Berlin, 16.11. 23:00Z bis 23.11. 23:00Z). Messung 24.11.2026 morgens per `gh pr list` (666 gemergte PRs: 361 Hand, 25 `app/claude`, 280 Datenbot) und `gh run list --created` je Tag (Kette 1248, Prüfer 1040, Deploy 1794 Läufe). Skripte: Scratchpad `dl-an/`. Runs ohne `--created` kappen bei 1000 und lieferten erst falsche Zahlen (Deploy-Stau scheinbar 4500 min) — verworfen.

## Messwerte (Minuten)

| Größe | n | Median | p90 |
|---|---|---|---|
| PR offen → Merge, Hand | 361 | 44 | 192 |
| dasselbe, tagsüber geöffnet (08–22 Uhr) | 249 | 36 | 123 |
| PR offen → Merge, Agent (`app/claude`) | 25 | 92 | 366 |
| PR offen → Merge, Datenbot | 280 | 0,1 | 0,1 |
| offen → letzte grüne Kette (Hand) | 361 | 21,5 | 120 |
| letzte grüne Kette → Merge (Hand) | 361 | 10 | 71 |
| letzter grüner Prüfer → Merge | 207 | 2,5 | 20 |
| Kette-Läufe je Hand-PR (ohne skipped) | 361 | 2 | 5 |
| Kette Dauer (success) | 622 | 8,4 | 21,8 |
| Prüfer Dauer (success) | 757 | 3,2 | 7,3 |
| Deploy Dauer (success) | 562 | 11,8 | 19,8 |
| Deploy Wartezeit bis Start | 1794 | 0 | 0 |
| Merge → Ende nächster grüner Deploy | 666 | 18,6 | 34 |
| Hand-PR offen → live | 361 | 65 | 211 |
| dasselbe, tagsüber geöffnet | 249 | 53 | 141 |

Gegenprobe `tage.jsonl`: ketteDauerMedianMin 5,5–12 je Tag (mein Median 8,4/6,2 ohne cancelled: passt), medianOffenBisMergeHandH 0,42–1,14 h je Tag (passt zu 44 min, Tendenz steigend). Unterschied: die Kennzahl ist ein Tagesmedian, p90 fehlt.
Auftrag → live: Der Auftrag selbst (Daniel → Agent) ist nicht messbar, nur PR-Öffnung → live. Der Deploy-Wert nimmt den ersten grünen Deploy-Lauf nach dem Merge (Ende des Laufs); das kann ein Lauf für einen späteren Commit sein, daher grobe Näherung.
Grob: 8 Prozent der Hand-PRs (39 von 361) brauchen länger als 3 h, 135 länger als 1 h.

## Die drei größten Schwachstellen

1. **Kette läuft nach jedem Nachzug neu, oft mehrfach.** Median 2, p90 5, p99 11 Kette-Läufe je PR; von 1248 Kette-Läufen sind 230 `cancelled` und 107 `failure` (10 % der nicht abgebrochenen). Das Stück offen → grüne Kette (Median 21,5 min, p90 120) ist doppelt so lang wie ein Kettenlauf. Beleg PR 4603 (Pokémon Horizonte, 19,8 h offen): 20 Kette-Läufe, 8 cancelled, 3 failure, erst der 13. und 20. Lauf endgültig grün. PR 4417: 10 Läufe, Prüfer dazwischen dreimal `failure`.
   Vorschlag, Untergrenze: erst messen, welche Ursache die Fehlschläge/Abbrüche haben (ein Auszählskript über `gh run view --log-failed` der 107 Failure-Läufe, Gruppierung nach fehlgeschlagenem Schritt). Einfachster Weg, wenn Nachzüge die Hauptursache sind: Nachzug nur noch, wenn die Änderung tatsächlich mit main kollidiert, nicht bei jedem Mainstand. Ob die Merge-Reihe das heute schon so hält, ist Vermutung (Lesekette `merge-reihe.sh`/`nacht-merger.yml` nicht verfolgt).
2. **Letzte grüne Kette → Merge: Median 10 min, p90 71, p99 627.** Hand-Merge, also Warten auf Hauptsitzung/Prüfer-Abnahme/Merge-Reihe, nicht auf Technik. Tagesmedian `medianCiGruenBisMergeHandH` stieg 17.→23.11. von 0,09 h auf 0,57 h (5 min → 34 min), parallel 43 → 102 Hand-Merges je Tag. Der Engpass wächst mit der Menge, nicht mit der Kettenzeit. Beispiel PR 4530 (Patch Notes): Kette grün 23:30, Merge 12:44 am nächsten Tag (nachts liegen gelassen).
   Vorschlag, Untergrenze: Stufe-0-PRs (`pr-stufe.mjs`) mit grüner Kette automatisch mergen lassen (Merge-Freigabe `gh pr merge --auto` ist der einfachste Weg, kein neues Werkzeug), Hauptsitzung schaut nur Stufe 1/2 an. Vorher an einem Tag nachzählen, wie viele der 361 Stufe 0 gewesen wären (`pr-stufe.mjs` je PR, nicht gemessen).
3. **Agent-PRs (`app/claude`) und lange Ausreißer.** Median 92 min, p90 366 min, also doppelt so lang wie Hand-PRs; die zehn längsten Hand-PRs liegen bei 13–20 h (4603, 4417, 4509, 4327, 4329, 4530, 4335, 4622). Muster: Kette grün, danach Stunden bis Merge, oder Prüfer-Nachbesserung über Nacht. Prüfer selbst (3,2 min) und Deploy (Wartezeit 0, 11,8 min, schon 18.11. entkoppelt) sind nicht der Engpass.
   Vorschlag, Untergrenze: im Lagebuch eine Zeile „PR grün und älter als 2 h“ erzwingen (die vorhandene Stau-Kennzahl `stau.aeltestesH` im `tage.jsonl` zeigt nur den ältesten, 1,8–4,3 h). Einfachster Weg: Wachphase mit `node tools/liegegut.mjs` zuerst, wie die Regel „erst zu Ende bringen“ ohnehin verlangt; messen, ob p90 offen → Merge unter 120 min fällt.

## Nicht auffällig (Beleg)
- Deploy: 0 min Wartezeit im Median und p90, 11,8 min Dauer, 560 erfolgreiche Läufe in 7 Tagen; Merge → grüner Deploy-Ende 18,6 min (p90 34).
- Kette Wartezeit auf Runner: Median und p90 0 (max 72 min, Einzelfall).
- Prüfer: 3,2 min (p90 7,3).

## Offen / unsicher
- Der Anteil der Failure-Läufe nach Ursache (Flake, echter Fehler, Konflikt) ist nicht ausgezählt.
- Offen → live enthält Nachtzeit (nach 22 Uhr geöffnete PRs); tagsüber-Werte stehen deshalb getrennt.
- Merge → Deploy nimmt den nächsten grünen Lauf, nicht den, der genau diesen Commit trägt.

## Rückblick
- Gut: Prüfer und Deploy sind schnell und ohne Stau; `tage.jsonl` stimmt mit der Gegenmessung überein.
- Schlecht: `gh run list --limit 1000` kappt still; wer die Zahl nicht gegen den ältesten Lauf prüft, bekommt Scheinwerte (Deploy-Stau 4500 min).
- Unerwartet: Nicht die Kette (8 min), sondern ihre Wiederholungen und das Warten nach Grün dominieren die Zeit.
- Vorschlag: `tage.jsonl` um p90 und „Kette-Läufe je PR“ ergänzen; einen Messskript-Eintrag für `--created` je Tag im Werkzeugkasten ablegen.
- Veraltet: nichts gefunden (Protokollzeile vom 16.10.2026 „Auftrag→live Median 74 min“ gilt nur für damals, jetzt 65 min offen → live).
