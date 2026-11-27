# Nachtrag nach Merge von main (27.11.2026)

- Merge `origin/main` (PR 5165, jaNachNein, Zähler „jüngerer Termin“) in `fix/nein-aufheben-streaming`; main-Verhalten unverändert übernommen, Commit 652bec8c8.
- `git log -p origin/main -S neinMitAdresse`: leer, main hat die Ausnahme nicht. Der PR ist **nicht überholt**.
- Übrig (4 Dateien, +26/−7): `neinMitAdresse` in `bau/11-7-wege-aus-terminen.ts` (ohne `kanal` bleibt ein Nein an echter Titeladresse), Fälle 45–49 in `check-wege-aus-terminen.ts`, ein Satz in `maengel.md`, Patchnote `anbieter-trotz-altem-nein.yaml` (vermutlich neben main-Patchnote redundant, bitte prüfen).
- Rot gegen main: `check-wege-aus-terminen` mit main-Fassung von 11-7 → 2 FEHLER (Sammelfall 45–49 und „Netflix (46) bleibt“); mit PR-Fassung grün.
- Mutationen: Ausnahme weg → rot (2); `!r.kanal` entfernt → rot (49, Kanal-Termin); Sammelkern als Adresse → rot (2); leere Adresse als Adresse → rot (5).
- Grün: `check-wege-aus-terminen: ok`, `check-handbelege-nein-ueberholt-lauf` ok, `npx tsc --noEmit -p .` Exit 0.
