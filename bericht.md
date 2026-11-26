# Bericht handlung-satz-teil-10 (26.11.2026)

- Zweig `daten/handlung-satz-teil-10`, eine neue Datei `data/curated/ein-satz-handlung/teil-10.yaml`, 7 Commits (je rund 40 Titel plus Nachtrag), gepusht.
- 244 Titel im Bereich 136804–163077; 240 Sätze, 4 Lücken, 4 mit `umfang: reihe` (152677, 155645, 156001, 158871).
- Lücken: 145564 und 153734 ohne Quelle im Repo; 145850 (Werbespots) und 154147 (Girls-und-Panzer-Beigabe) nur Titelangabe ohne Handlung.
- Nähe-Treffer (5 Wörter): vorher 34 Sätze, nachher 0; längste gemeinsame Folge 4 Wörter (Gegenprobe mit `vergleiche()` aus dem Repo).
- Länge: 54 Entwürfe über 160 Zeichen gekürzt, jetzt längster Satz 160. YAML parst, ids sortiert, jede Ziffer belegt.
- Stichprobe 10 Sätze (136880, 139095, 142329, 142455, 146065, 146850, 151803, 153518, 154473, 160389): 10 richtiger Teil und Kern, 0 geändert.
- 7 Sätze mit nur einer Familie (zweite Quelle ohne Inhalt): 136829, 146638, 147729, 151126, 151803, 154983, 155168.
- Der Container hatte ein `origin/main` vom 24.11. (über 300 Commits alt): Zweig auf das aktuelle main umgesetzt (Force-Push nur des eigenen Zweigs), Titelmenge und Quelltexte neu verglichen, 158898 nachgetragen, 150075 gegen den geänderten Text neu geprüft.
- Netz nur für die zwei quellenlosen Titel befragt: Handlung steht bei Wikipedia (Magic Brush) und Baidu Baike (冰上遇险); beide sind keine erlaubte Familie, deshalb kein Satz und nichts davon im Repo.
- `check:vor-commit` nicht gefahren (Agentenregel); `pr-vorpruefung.mjs` mit dem PR-Text grün (nur Hinweise auf genannte, nicht geänderte Dateien).

## Rückblick
- gut: Sätze blockweise per JSON einspielen und sofort prüfen; die Prüfung fand jeden Namens-Fünfer („Satoru Gojo und Suguru Geto“).
- schlecht: Länge nach Gefühl geschätzt, 54 Kürzungen nötig; der veraltete Stand fiel erst bei der Vorprüfung auf („no merge base“).
- unerwartet: fünf Wörter am Stück entstehen schon durch Eigennamen und Titel (King of Iron Fist, VR-Spiel Shangri-La Frontier); TMDB beschreibt bei Fortsetzungen oft die erste Staffel.
- Vorschlag: Auftrag beginnt mit `git fetch origin main` und Zweig von `FETCH_HEAD`; Familie `wikipedia` zulassen, dann sind 145564 und 153734 schreibbar.
- veraltet: Probelauf-Bericht zeigt Sätze über 200 Zeichen als Muster, die Regel ist 160.
