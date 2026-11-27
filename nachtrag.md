# Nachtrag 2 (27.11.2026), Kopf a80fecaa

**1. Rot gegen main.** Test `pipeline/check-wege-aus-terminen.ts` (Stand Kopf) gegen einen Export von `origin/main` (49c3d1ec, `git archive`, ohne `neinMitAdresse`):
```
exit 1
FEHLER: überholtes Nein: … Kanal-Termin trotz Nein mit Adresse (49) … — 14713|primevideo,102836|pr…   (Fall 49)
FEHLER: Netflix (46): Nein mit echter Titeladresse bleibt, auch wenn älter als der Termin
```
Am Kopf: `check-wege-aus-terminen: ok`, Exit 0.

**2. Dateien** (`git diff --stat origin/main...HEAD`, 3 Dateien, +25/−7):
- `pipeline/bau/11-7-wege-aus-terminen.ts`: `neinMitAdresse`; ohne `kanal` hebt ein sicherer Termin kein Nein an echter Titeladresse auf.
- `pipeline/check-wege-aus-terminen.ts`: Fälle 45–50 (Netflix ohne Adresse, mit Adresse, geschätzt, Termin heute, Kanal-Termin, Ja neben Nein).
- `docs/wissen/maengel.md`: ein Satz zur Ausnahme.

**Wirkung am Kopf: 0.** Gemessen: `ueberholteNeins(loadDubChecks(), public/data/releases.json, 2026-11-27)` mit dem Code von main und vom Kopf: beide 2 Schlüssel, Differenz leer (Skript im Scratchpad, `tsx wirkung.mts <Wurzel>`). Grenze: Ein voller Bau fehlt, weil `data/cache` in der Cloud fehlt; es zählen nur Handbelege, nicht die Cache-Checks. Titel/Wege, die sich ändern: 0.

**3. Mutationsprobe `neinMitAdresse`** (je Mutante `check-wege-aus-terminen`):
| Mutante | rot durch |
|---|---|
| `!== ''` → `=== ''` | 45, 46, Ja-Beleg-Fall (140960), „Termin heute“, Sammelzeile; neu auch 50 |
| `istSammelKern` umgedreht | Sammelzeile, Kuroko, 46 |
| `istSammelKern`-Bedingung entfernt | Sammelzeile, Kuroko |
| `!r.kanal` → `r.kanal` | Sammelzeile, 46 |
| `!r.kanal` entfernt | Sammelzeile (49) |
| `available === false` entfernt | **überlebte**, jetzt rot durch neuen Fall 50 (Ja an Titeladresse + älteres Nein ohne Adresse) |

**4. Patchnote** `anbieter-trotz-altem-nein.yaml`: Wirkung 0, deshalb aus dem PR entfernt.

Grün: `check-wege-aus-terminen`, `check-handbelege`, `check-nein-handbeleg-abschluss`, `check-kein-weg-trotz-quelle-bestand`, `npx tsc --noEmit -p .` (Exit 0).
