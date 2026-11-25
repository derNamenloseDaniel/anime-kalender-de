# Bekannte Warnung mit Nachprüftermin nimmt die Wache selbst ab

`tools/laeufe-aufraeumen.mjs` zeigte dieselbe geprüfte Warnung mit jedem Bestandsbau neu (Mängel Stillstand „sprecher 351→356“, Besitzer Wochenlauf 30.11.), jeder Lauf musste einzeln mit `--erledigt` abgenommen werden.

- Neu: `tools/bekannte-warnungen.json` (`workflow`, `muster` als Regex auf den Warnungstext, `bis`, `notiz`). Passt eine Warnung auf Workflow und Muster und ist `bis` (Tag inklusive, UTC) nicht vorbei, nimmt `laeufe-aufraeumen` sie über den vorhandenen Weg (`setzeErledigt`) ab und schreibt `bekannt bis <Datum>: <notiz>`. Mit `--trocken` nur angezeigt.
- Nach `bis`: Warnung erscheint wieder, dazu `abgelaufen: … – entfernen oder verlängern` (auch ohne passende Warnung).
- Andere Texte bleiben sichtbar; kein Freibrief je Workflow.
- Die Stillstand-Warnung (`bestand-bauen.yml`) hängt die Artnamen ohne Zahlen an (`… — gestiegen: sprecher`), sonst würde das Muster jede künftige Art verschlucken. Der Eintrag passt nur auf genau „gestiegen: sprecher“.
- Doku: `docs/wissen/betrieb.md`, Skill `autonomer-modus`.

Tests: `tools/bekannte-warnungen.test.mjs` (vor/nach `bis`, anderer Text, andere Art, anderer Workflow, Repo-Eintrag), `tools/bestand-qualitaet-schritt.test.mjs` angepasst; Mutationsprobe einzeln: Datumsvergleich umgedreht, `+ TAG_MS` entfernt, Muster ignoriert, Workflow ignoriert — alle rot. `tsc --noEmit` grün. Nicht lokal prüfbar: `tools/laeufe-abruf.test.mjs` hängt in der Sandbox auch auf `origin/main` (>100 s); die Verdrahtung in `laeufe-aufraeumen.mjs` ist nur per `node --check` und über die Kette geprüft.

Patch Notes: keine (Betrieb)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
