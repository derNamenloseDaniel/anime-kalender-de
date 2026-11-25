# Bericht delta-zuak-nachtraeglich

- Zweig `fix/delta-zuak-nachtraeglich` gepusht (ein Commit, 5 Dateien); kein PR (Cloud, macht der Dirigent).
- Weg: Zeile speichert `titelWeg` = Title-Kennungen (AniList bzw. eigene, z. B. 7000001); `kennungen.json` führt sie als zweites Feld, `zuAk` als viertes. Bewertung in `ereignisse()` (`bestand-pendel.ts`), aufgerufen von `delta-pruefen.mjs`.
- Vorher: Zeile 24.11. 18:30 ⚠ „3 Titel weniger“; nachher erklärt, Exit der Zeile grün. Zeile 25.11. 18:07 bleibt rot bis `zuAk` aus PR 5035 im Repo steht (gewollt).
- Test neu, Mutationsprobe rot, Kontrolle ohne zuAk rot; `delta-wache-*`, tsc, Mutationsanker, Bot-Pfade-Wächter, check-workflows grün. `check:vor-commit` nicht gefahren.
- Doku: Zeile in `datensatz.md` (Abschnitt „Aufgenommene Seiten“).
- Gut: Wächter `pr-nachrechnen-bot-pfade` fing meinen Dateinamen-Literal sofort. Schlecht: Heredoc-/`node -e`-Hook kostete zwei Anläufe. Unerwartet: titelWeg ist auf 10 Kennungen gedeckelt; reicht für die Wache.
- Vorschlag: Rest-Risiko — ein Titel, der schon als „verschoben“ erklärt war und zuAk trägt, würde doppelt gezählt; durch die Deckelung auf den Rest unkritisch.
