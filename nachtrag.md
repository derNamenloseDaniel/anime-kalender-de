# Nachtrag R1 (Stufe 2) – warnung-bekannt-bis

Zweig `feat/warnung-bekannt-bis`, Kopf `e25f5c9a`. Basis: `origin/main` = `8ce0a8dd5e78` (25.11.2026 21:08 UTC), per Merge eingebracht (`2b9b4d46`), kein Rebase.

1. **Segmente (blockierend):** `wendeBekannteAn` teilt die Notiz an ` · `, jedes Segment muss ein gültiger Eintrag mit `^(?:muster)$` treffen; nur bei lauter bekannten Segmenten `bekannt`, sonst `unbekannt` samt Rest, und die Wachzeile `WARNUNG im Verlauf` zeigt nur den Rest. Tests (`tools/bekannte-warnungen.test.mjs`): reiner Stillstand-Satz, fremdes Segment davor (Datenqualität, Crunchyroll), danach, Text im selben Segment vor dem Satz, alle Segmente bekannt. Mutanten: `every`→`some` rot (M1); Verankerung `^…$` entfernt rot (M6, erst nach dem Zusatzfall „Fremdtext vor dem Satz“; vorher überlebte er).
2. **Verdrahtung:** die Abnahme-Logik steht jetzt als `nimmBekannteAb` in `bekannte-warnungen.mjs` (Senden, Uhr, Ausgabe als Parameter), `laeufe-aufraeumen.mjs` ruft sie nur auf. Funktionstests mit POST-Aufzeichnung: passend → ein POST, `--trocken` → keiner, ohne Token keiner, fremd → Zeile, kein POST, abgelaufen → `abgelaufen:` auch ohne Warnung. Dazu 7 Läufe des ganzen Werkzeugs in `tools/laeufe-abruf.test.mjs` (Abschnitt „Bekannte Warnungen im ganzen Werkzeug“, Kulisse mit eingefrorener Uhr). Mutant `trocken: false` in der Verdrahtung → rot (M7); `--trocken`-Ignorieren in der Funktion → rot (M5).
3. **Hänger:** Ursache ist nicht der Test, sondern `laeufe-aufraeumen.mjs`: jeder Start ruft ~25 s lang `gh`/`git` auf (lokal am Proxy je Aufruf Sekunden, GraphQL 403), die ältere Datei startet es ~11-mal (vorher: bei 120 s noch nicht fertig). Meine neuen Fälle setzen `PATH` ohne `gh` (Aufruf scheitert sofort), `spawnSync`-Zeitlimit 60 s, kein Server/Timer: 7 Starts in 3 s. Gesamtdatei lokal: vorher > 120 s (nicht beendet), nachher 254 s, Exit 0 (die alten Fälle bleiben unverändert).
4. **lauf_id:** fehlt sie (`undefined`/`null`), kein POST, Zeile „ohne lauf_id, nicht abgenommen“ (Unit- und Werkzeug-Test; Mutant lauf_id-Wächter entfernt → rot, M3). `setzeErledigt` läuft nur bei vollständig bekannter Warnung; fremde Warnungsteile werden also nie überschrieben (Test „fremde Warnung: kein POST“, beide Positionen). Notiz des POST nennt je bekanntem Segment seinen Eintrag.
5. **Doku:** `docs/wissen/betrieb.md` und `.claude/skills/autonomer-modus/SKILL.md`: `bis` = UTC-Tag, inklusive; Abnahme nur bei lauter bekannten Segmenten.

Mutationsdatei `tools/mutationen/maengel-stillstand.json`: nicht betroffen (Workflow-Zeilen unverändert). `tsc --noEmit -p .` grün, eslint grün, `bestand-qualitaet-schritt.test.mjs` grün.

**Rückblick**
- Gut: Auslagern von `nimmBekannteAb` machte die Verdrahtung ohne Prozessstart testbar.
- Schlecht: erste Fassung ohne Verankerung rutschte durch, weil die Tests nur ein fremdes Segment, nie Text im selben Segment hatten (M6 überlebte).
- Unerwartet: `laeufe-aufraeumen.mjs` kostet lokal ~25 s je Start (`gh` am Proxy); der Hänger kam daher.
- Vorschlag: `laeufe-abruf.test.mjs` insgesamt mit `PATH` ohne `gh` fahren (254 s → Sekunden), eigener PR.
