# Nachtrag zu PR 5091 (Prüfrunde 1)

- Befund 1 (Panel-Job rot, `tools/pille-blase-messen.ts:30` TypeError, Art 'omu' erwartet eine Blase, die der PR entfernt) -> 'omu' aus `ARTEN` gestrichen (Commit fca1e438); Beleg: lokal `AK_CHROME=/opt/pw-browsers/chromium npx tsx tools/pille-blase-messen.ts` grün (hell/dunkel, 375/480 px, je 24 Blasen), `npx tsc --noEmit -p .` ohne Fehler.
- Befund 2 (Start-Budget-Zahl der Beschreibung falsch) -> Richtigstellung: Log der Kette zeigt 172,5 KB gzip von 190,0 KB (17,5 KB Luft), kein Rückgang gegenüber 171,0 KB; die Zahl „171,0 → 170,9 KB“ der PR-Beschreibung gilt nicht (Beschreibung bleibt unverändert, dieser Nachtrag gilt).
- Offen: Wächter `check-nur-deutsch` (Mutationsprobe 11/11) und Bühnen-Screenshots vom Prüfer nicht gesucht; Kette nach dem Push abwarten.
- Lehre: Wer eine Oberflächenart entfernt, sucht per Grep alle Messskripte in `tools/` mit dem Artnamen (`grep -rn "'omu'" tools/`), nicht nur Tests; die Kette fand es erst als Panel-Job.
