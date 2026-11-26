# Nachtrag: Nachbesserung PR 5095

1. Befund 1 (Patchnote-Untertitel > 10 Wörter) -> Untertitel gekürzt auf „Call of the Night und JoJo Steel Ball Run betroffen“; Beleg: `npx tsx pipeline/check-patchnotes.ts` grün (vorher rot).
2. Befund 2 (Kette rot: Logik 2, Bau, Datenbau, Aussehen) -> Ursache vermutlich Folgefehler derselben Patchnotes-Prüfung im Bau; lokal nicht nachprüfbar (Vollläufe gesperrt), tsc --noEmit und die berührten Checks grün; Bestätigung durch den neuen Kettenlauf offen.
3. Befund 3 (Screenshots/Live-Messung fehlen) -> unverändert offen, braucht Bau und Deploy.
4. Befund 4 (Test nicht gegen Basis rot) -> nicht änderbar: Funktion existiert dort nicht; Mutationsprobe 7/7 bleibt der Beleg.
5. Befund 5 (Aufrufer von `deutschBelegtTrotzOffen` ohne Test) -> offen, in dieser Runde nicht umgesetzt.
Lehre: Patchnote-Untertitel vor dem Push mit `npx tsx pipeline/check-patchnotes.ts` prüfen (Grenze 10 Wörter).

## Nachtrag (Kette grün, Kopf 62cd5b19edb1)

**Ursache:** `klaereDeutschBelegteTermine` nahm bei belegtem Weg am Titel auch bei automatischen Terminen „Synchro offen“ zurück (Fool Night, `auto-10021751-netflix`); die Quelle (Anime2You) sagt keine Synchro zu, `autoReleaseWidersprueche` meldete die fehlende Kennzeichnung.

**Änderung:** Automatische Termine werden nur geklärt, wenn ihre Quelle Synchro zusagt (`adressenMitSynchroZusage`); der Wächter `deutschBelegtTrotzOffen` prüft nur Handtermine. Test mit genau diesem Fall in `pipeline/check-deutsch-belegt-klaeren.ts`. Merge von origin/main (Import-Konflikt in `pruefung.ts`).

**Beleg:** `npx tsx pipeline/check-deutsch-belegt-klaeren.ts` → „alles grün“ (inkl. „Quelle ohne Zusage bleibt offen“), `npx tsc --noEmit -p .` ohne Ausgabe. Der Datenbau (Logik 2) lief in der Cloud nicht.
