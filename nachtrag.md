# Nachtrag: Nachbesserung PR 5095

1. Befund 1 (Patchnote-Untertitel > 10 Wörter) -> Untertitel gekürzt auf „Call of the Night und JoJo Steel Ball Run betroffen“; Beleg: `npx tsx pipeline/check-patchnotes.ts` grün (vorher rot).
2. Befund 2 (Kette rot: Logik 2, Bau, Datenbau, Aussehen) -> Ursache vermutlich Folgefehler derselben Patchnotes-Prüfung im Bau; lokal nicht nachprüfbar (Vollläufe gesperrt), tsc --noEmit und die berührten Checks grün; Bestätigung durch den neuen Kettenlauf offen.
3. Befund 3 (Screenshots/Live-Messung fehlen) -> unverändert offen, braucht Bau und Deploy.
4. Befund 4 (Test nicht gegen Basis rot) -> nicht änderbar: Funktion existiert dort nicht; Mutationsprobe 7/7 bleibt der Beleg.
5. Befund 5 (Aufrufer von `deutschBelegtTrotzOffen` ohne Test) -> offen, in dieser Runde nicht umgesetzt.
Lehre: Patchnote-Untertitel vor dem Push mit `npx tsx pipeline/check-patchnotes.ts` prüfen (Grenze 10 Wörter).
