Nachtrag (Runde 1, Commit 0b4141d7):

1. Verdrahtung ungetestet → `pipeline/check-cr-zaehlung.ts` fährt jetzt `baueReleases` (Wegwerf-`AK_ROOT`) mit den echten Black-Clover-Einträgen aus `data/curated/streaming-herbst-2026.yaml` und Slot Folge 174: Folge 4, Start 07.11. (kein Staffelstart 28.11.), OmU-Begleiter 03.10. ohne Beobachtungen. Gegenprobe ohne `crZaehlungAb`: 174 im Datensatz und Wächter schlägt an (Test rot ohne Fix). Beleg: `npx tsx pipeline/check-cr-zaehlung.ts` grün, 7 neue Zeilen.
2. OmU-Regel über den Anlass hinaus → Test zählt `sprache: omu` mit `platform: crunchyroll` in den kuratierten Dateien: genau 1 (Black Clover); Zählung aller `data/curated/*.yaml` per Skript ebenfalls 1.
3. Wirkung am echten Datensatz nicht belegt → ohne `data/cache` kein voller Bau möglich; ersatzweise läuft der echte Bau-Aufruf mit den echten Kuratiert-Einträgen (siehe 1); Datenbau der PR-Kette prüft den Wächter am Bestand.
4. Kleinigkeit `earliest` ≤ 0 → `slotAufStaffelzaehlung` setzt `earliest` auf undefined, wenn dessen Folge vor dem Staffelstart liegt (`pipeline/lib/cr-zaehlung.ts`).

Lehre: Eine Wächter-/Umrechnungsfunktion braucht einen Test über den echten Aufrufweg (Bau-Phase mit echten Kuratiert-Einträgen), nicht nur über ihre Funktionen.
