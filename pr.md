# Alte Horizonte-Kennungen leiten auf die Serie um, Riegel-Ausnahme entfällt (F157 Folge)

Folge-PR zu #4897. Bedingung erfüllt: Bestandsbau 45459816036 (Commit e0c3f0f744) grün, `public/data/titles.json` ohne 7000001–7000003.

- `data/kennungen.json`: 26469–26471 bekommen `zuAk` 14839. `ak-umleitung.json` trägt `[[26469,14839],[26470,14839,45],[26471,14839,89]]`, `/t/26469/`–`/t/26471/` werden Weiterleitungen auf `/t/14839/`; Favoriten und „gesehen bis“ ziehen mit Versatz um.
- `pipeline/bau/staffel-wegfall.ts` samt Nutzung im Verlust-Riegel und Test entfernt; `verlust-riegel.ts` ist wieder wortgleich mit dem Stand vor #4897.
- Neuer Wächter in `check-ak-umleitung-versatz.ts` (läuft in `check:logic`): jede `alteKennung` einer `*-staffeln.yaml` hat in `data/kennungen.json` ein `zuAk` auf die Serie (Gegenprobe: ohne die drei `zuAk` rot mit `[7000001,7000002,7000003]`).
- `staffelzaehlung.bis` bleibt `2026-11-25`, jetzt begründet (exklusiv, Rückbau am 24.11. abends live, Staffel 4 Folge 1 erst am 27.11.); `datensatz.md` und Skill `pruef-technik` nachgeführt.

**Schnellweg** (echte Daten): `uebersetzeVerzeichnis(tmp, data/kennungen.json)` → Paare wie oben (vorher: keine); `umleitungen()` → `t/26469/`, `t/26470/`, `t/26471/` → `t/14839/`.

**Prüfungen grün:** check-ak-umleitung-versatz (25 Fälle), worker-ak-umleitung-versatz, check-staffel-altmeldungen, quarantaene-pruefungen, check-horizonte-staffeln(-bestand), check-datei-kennungen, check-eigene-titel, check-logic, check-logic-bestand, check-favoriten-feed-bestand, check-mal-dubletten-bestand, check-anisearch-aufgenommen, `tsc --noEmit -p .`.

Keine Patchnote (kein sichtbarer Nutzen außer erhaltenen Favoriten).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
