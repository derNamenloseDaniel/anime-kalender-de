Zweig `feat/f157-reihen-reiter`, Kopf d0f6a37cb (5 Commits: Umbau 88c87884, feat 02e02de3, ci b4b6f6f9, fix 9baaa958, test d0f6a37c). Kein PR angelegt, der Text liegt in `prtext/f157-reihen-reiter`.
Ersetzt: Über dem Antwortkasten stehen wieder die Staffel-Reiter der Reihe wie im Bild 47f7bda363 (`reihen-reiter.tsx`, `reihen-reiter-liste.ts`, Titelwechsel über `useReihenWechsel`). Die Folgen-Reiter bleiben, am Kasten entfällt nichts, weil es dort keine Staffelwahl gab. Mockup: Titel und notiz nennen beide Reiter, `ersatz {}`.
Folgen-Reiter-Dateien: Berührt ist nur `staffel-reiter.tsx`, und nur mit Exporten (Umbau, Ausgabe 5/5 gleich). Konflikt mit `feat/f157-staffelnamen` zu erwarten in `web/buehne/mockups/staffel-abschnitt.tsx` (notiz).
Bildvergleich (3 Fälle × Handy/Desktop × hell/dunkel, Zweig `bilder/f157-reihen-reiter`): Die Reiterleiste ist in allen 12 Zellen gleich. Abweichend ist nur die TOGGO-Fläche aus #4889 bei Hauptserie und Reisen, sie kam nach 47f7bda363.
Fund: Das Listenstück aus dem Mockup stürzte ab, wenn es keinen Staffelstand gibt (Sakamoto Days, 86; Bühne `disc-bereich-2`, Panel öffnete nicht). Behoben, die Klassenprüfung über alle Bühnenfälle ist gegen die alte Zeile rot.
Klasse: 3 von 19 main-Commits seit 01.11. hätten der Wächter gesperrt (#4896, #4889 TOGGO, #3852 Merken-Gold gelöscht).
Wächter: `tools/mockup-freigabe-pflicht.mjs` (check:logic). Ein PR mit web/src und geändertem titel/notiz/ersatz eines Mockups braucht die Zeile „Mockup-Änderung freigegeben: <Zitat>“, nur das Leeren von ersatz auf {} ist erlaubt. Lehre steht in bauer.md, pruefer.md K9v und im Skill mockups.
Prüfungen: tsc Exit 0, eslint grün, 17 Panel-Prüfungen und neue Tests grün, Mutanten 29+15 rot / 0 überlebt, `buehne:messen` voll Exit 0 (473 = Basis), Startbudget 170.1 = 170.1 KB.
Schätzung vs. Ist: 90 vs. ~115 min. Prozesse: keine übrig.

Rückblick
- Gut: Der Bildvergleich gegen den Freigabe-Commit hat bestätigt, dass die Komponente 1:1 dem Mockup entspricht.
- Schlecht: Der Absturz zeigte sich erst im vollen Bühnenlauf; die Panel-Prüfungen rechnen die Reiter nur an Pokémon.
- Unerwartet: Das Leeren von `ersatz` ist laut Skill der normale Bauschritt, deshalb ist es vom Wächter ausgenommen. Lokales Playwright erwartet Browser 1234, installiert ist 1243 (Umweg über `PLAYWRIGHT_BROWSERS_PATH`).
- Vorschlag: Bau-PRs mit neuer Panel-Komponente fahren lokal `buehne:messen`; Unit-Prüfungen sehen nur ihre Fälle.
- Veraltet: datensatz.md „Staffel-Reiter im Panel“ nennt keine Reihen-Reiter, der neue Abschnitt direkt darunter ergänzt sie.
