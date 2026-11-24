Bericht f157-reihen-reiter-nachtrag-2411 (Kopf 700cbe55, PR 4912)

Ergebnis: Die Reiter an der roten Box zeigen die Titel der Kategorie des geöffneten Titels (Hauptserie unverändert 1–5 … 25, Film 1–24, Specials, eigene Serien). Jeder Reiter trägt nur die Kurzform, der volle Titel steht in title und aria-label. Die Reihenliste zeigt diese Titel nicht mehr, auch nicht in der Schalterzahl. Main ist gemergt.
Auslegung: Kategorie = Gruppe der Reihenliste. In Gruppen außer der Hauptserie bekommen Teile hinter „ohne Synchro“ keinen Reiter (sie bleiben über den Schalter erreichbar), sonst stimmte die Nummer nicht mit Daniels Film-Beispiel überein (Toho Cinemas 2017). Horizonte nimmt weiter die Sammeltitel-Reiter 1–4.
Beleg: check-reihen-reiter ok, Mutationen 45 rot / 0 überlebt, 14 Importeure grün, tsc grün, Startbudget 170.7 KB = Basis. Bühnenbilder für 4 Fälle, buehne:messen mit Exit 0 (477 ok).
Offen: Nachtrag als PR-Kommentar posten (Dirigent, aus prtext/f157-reihen-reiter:nachtrag.md). Die Wache mockup-freigabe-pflicht sieht eine geänderte notiz. Die Zeile „Mockup-Änderung freigegeben“ steht im Nachtrag.
Schätzung vs. Ist: 60 min vs. ~75 min. Prozesse: keine übrig.

Rückblick
- gut: Die Klassenprüfung über alle 510 Titel-Reihe-Paare (Kurzform, doppelt, unerreichbar) fängt die Regel als Ganzes, nicht nur Pokémon.
- schlecht: Der Force-Push auf den Bildzweig wurde vom Klassifikator gesperrt. tools/pr-bilder.mjs pusht selbst, das wusste ich vorher nicht.
- unerwartet: Die Reihenfolge der eigenen Serien setzt Horizonte 4 vor Horizonte 1 (gleiches Jahr, sortiert nach Kennung). Die Reiter übernehmen das von der Reihenliste, Kandidat für einen eigenen Auftrag.
- Vorschlag (erledigt, bauer.md Zeile 30): vermerkt, dass in der Cloud `git worktree add` vom Hook gesperrt ist (Windows-Pfad) und der Vorher-Stand per `git archive <sha> | tar -x` exportiert wird.
- veraltet: PR-Text „Was entfällt: nichts“ und „Film, Special: keine Reiter“ gelten nicht mehr, der Nachtrag ersetzt sie.
