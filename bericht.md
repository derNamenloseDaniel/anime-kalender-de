Zweig `feat/f157-folge-zuak`, Kopf 53dd249730afd900aa6164aa9dfb4c6b303f330c (von origin/main), PR-Text in `pr.md`.
Schnellweg echte Daten: ak-umleitung `[[26469,14839],[26470,14839,45],[26471,14839,89]]` (vorher keine Paare); Share-Weiterleitungen t/26469/, t/26470/, t/26471/ → t/14839/.
Ausnahme `staffel-wegfall.ts` weg; `verlust-riegel.ts` wortgleich mit Stand vor #4897; keine Nennung in Wächterlisten (tools/*.jsonl/txt/json, mutationen).
Neuer Wächter (check-ak-umleitung-versatz, check:logic): jede alteKennung hat zuAk auf die Serie; Gegenprobe ohne zuAk rot.
Grün: check-ak-umleitung-versatz, worker-ak-umleitung-versatz, staffel-altmeldungen, quarantaene-pruefungen, horizonte-staffeln(-bestand), datei-kennungen, eigene-titel, check-logic, logic-/favoriten-feed-/mal-dubletten-bestand, anisearch-aufgenommen, tsc --noEmit.

Rückblick
- Gut: Schnellweg mit vorher/nachher (stash) zeigte die Wirkung in Sekunden; Gegenprobe des Wächters an echten Altdaten.
- Schlecht: Hook-Sperren (python-Heredoc, Worktree-Ort) kosteten je einen Umweg — Skripte gleich ins Scratchpad, Worktrees unter `_worktrees/`.
- Unerwartet: kein Wächter prüfte bisher alteKennung→zuAk; `staffelVersatz` wirft nur bei fehlender Zeile, nicht bei fehlendem zuAk.
- Vorschlag: keiner offen; Skill pruef-technik verweist für das Vorbild jetzt auf `git show 94755919:pipeline/bau/staffel-wegfall.ts`.
- Veraltet: datensatz.md „kommt erst in einem Folge-PR …; bis dahin … tot“ → in Ist-Stand umgeschrieben.
