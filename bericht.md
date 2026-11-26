# Bericht handlung-satz-teil-05 (26.11.2026)

- Zweig `daten/handlung-satz-teil-05` (6 Commits, von main 312eef7c), eine neue Datei `data/curated/ein-satz-handlung/teil-05.yaml`; kein PR angelegt.
- Sätze: 242 von 244 Titeln (ids 10490–20552), alle höchstens 160 Zeichen, YAML parst (242 Einträge).
- Lücken: 2. 17657 Kater Tom und die fliegenden Zaubernüsse (einzige Quelle AniList nennt nur Vorlage und Veröffentlichung) und 18325 Silver Twilight (AniList nur „alte Dämonen und ein mutiger Junge“); Web-Nachsuche („Chibi Neko Tom no Daibouken plot“, „Dokkaebi Bangmang-i 1986 plot“) ohne belastbare Handlung.
- `umfang: reihe`: 1 (12715 The Hakkenden Teil 2, Quelle beschreibt nur die Reihe).
- Quellenlage: 161 Titel mit 3 Familien im Repo, 77 mit 2, 6 mit 1; davon 3 Sätze aus nur einer Quelle (16560, 18273, 19099), 16678 mit Web-Quelle Bulbapedia (Familie `fandom`), 4 mit `eigen`.
- Nähe-Treffer (5 Wörter, gegen alle deutschen und englischen Quelltexte je Titel): vorher 26 (25 im ersten Wurf, 1 bei einer Nachbesserung), nachher 0. Eigenes Skript im Scratch-Ordner mit der Wortzerlegung aus `tools/handlung-fakten/naehe.ts`; `tools/handlung-naehe.ts` selbst passt nicht (braucht Faktenkarten je Titel).
- Stichprobe 10 Zufallssätze (Seed 2611) gegen Volltexte nachgelesen: 10620, 10794, 12029, 12053, 13365, 14175, 16049, 16664, 17265, 20447 – 10 von 10 Kern getroffen, richtiger Teil bei den drei Fortsetzungen (Mardock 3, Railgun S, Hanasaku-Film).
- Namensschreibung nach deutschem Quelltext; wo der deutsche Text sichtbar falsch schreibt („Oefcoque“), steht „ihr Partner“ statt des Namens.
- PR-Vorprüfung grün (`pr.md`); `check:vor-commit` nicht gefahren (Kette), keine Tests berührt.
- Nicht erreichbar in dieser Sitzung: www.animenewsnetwork.com, movie.jorudan.co.jp (Netzfreigabe fehlt), nur WebSearch ging.

## Rückblick
- gut: Dossier je Titel (Quellen auf ~600 Zeichen gekürzt) plus Bau-/Prüfskript nach jedem 41er-Block; Nähe-Treffer fielen sofort auf.
- schlecht: TMDB-Text ist oft eine Kopie des aniSearch-Textes, „3 Quellen“ sind dann nur 2 unabhängige; Zahlwörter („sechs“) prüft mein Skript nicht, die habe ich von Hand nachgelesen (1 Fund, 19255, behoben).
- unerwartet: Abkürzungen wie S.H.I.E.L.D. oder E.S.W.A.T. zählen in der Wortzerlegung als 5 Wörter und lösen allein einen Treffer aus; Namenslisten in Quellreihenfolge ebenso. Flacher Klon: `pr-vorpruefung.mjs` bricht mit „no merge base“ ab, bis `git fetch --deepen=300 origin main <zweig>` gelaufen ist.
- Vorschlag: Der Einbindungs-Auftrag sollte Nähe und Länge als Prüfung ins Repo holen (mit Sonderfall Abkürzungen) und die Lücken als Zahl melden; der Auftragstext könnte den `--deepen`-Handgriff nennen.
- veraltet: Auftrag nennt „ca. 244 Titel“ – stimmt genau (244); sonst nichts gefunden.
