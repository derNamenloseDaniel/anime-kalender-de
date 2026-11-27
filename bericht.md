# Nachbesserung PR 5248 (Kopf 2b298ded4)

**Geändert:** Parser `wikipedia-sprecher.ts`: Spalte 0 ist immer die Rolle (Kaiju: „Rolle › Deutsch“ war der Figurname), `colspan` in Datenzeilen deckt mehrere Spalten (ein Sprecher für Staffel 1+2), Gruppenköpfe zwischen den Datenzeilen sind kein Spaltenkopf (Attack on Titan „Zivilisten“, Conan „Protagonisten“, One Piece „Weitere Figuren / Zivilisten“). Neuer Wächter `wikipedia-sprecher-waechter.ts` (Sprecher gleich Rolle, „N. N.“, „unbekannt“, „?“ → verworfen, gezählt, gemeldet) in Sammler (Warnzeile je Stimme) und Bau (Logzeile „n falsche Stimmen verworfen“). `data/wikipedia-sprecher.json` am 27.11. neu abgerufen: 68/68 Seiten, 0 gestört, 4 Stimmen verworfen (alle „N. N.“ Kaiju Staffel 2), 67 mit Tabelle. Kaiju steht damit richtig (Aoi = Rêzan Cheikhmous, Staffel 1).

**Neue Zahlen** (Handliste jetzt 68 Seiten / 116 Ziele, `maengel.json` 27.11.): von 357 offenen `sprecher`-Mängeln schließen **109** (9 belegt, **100 mit ≈**), 248 bleiben; 1 offenes Ziel ohne deutsche Spalte (Ron), 6 Ziele haben andere Quellen. Die 81/77 der PR-Beschreibung gelten nicht mehr. Patch Notes: „109 weitere Titel“; `docs/wissen/maengel.md` nachgeführt.

**Gegenlesung** (erste Rolle + erster Sprecher; beide stehen im Zeilenblock der Wikipedia-Fixture, Sprecher ≠ Rolle): **67 von 68 ok**, Ron Kamonohashi nennt nur Japanisch. Beispiele:

| Seite | Rolle | Sprecher |
|---|---|---|
| Kaiju No. 8 | Aoi Kaguragi | Rêzan Cheikhmous [Staffel 1] |
| Attack on Titan | Eren Jäger | Max Felder (ohne Zusatz) |
| Detektiv Conan | Conan Edogawa | Tobias Müller |
| Yū Yū Hakusho | Hiei Jaganshi | Hannes Maurer |
| Grappler Baki | Baki Hanma | Linus Kraus [1. Serie (2001)] |
| One Piece | Erzähler | Reinhard Brock [TV-Synchro, bis Folge 400] |

Alle 68 Zeilen der Gegenlesung: Scratchpad `/tmp/gegen.txt` (Lauf 27.11.; nicht im Repo).

**Negativtests (ohne Fix rot, mit Fix grün):** `check-wikipedia-sprecher.ts` an Basisparser: 6 ✖ (Kaiju Aoi/Iharu/„Stimme gleich Rolle“, AoT „Zivilisten“, Conan „Protagonisten“, Kleinstfall Gruppenkopf), danach 68 Fixtures ok. `check-sprecher-wikipedia-bau.ts` ohne Wächter im Bau: 2 ✖ (Rollen „Held=Held“, Zählzeile), danach ok. `check-wikipedia-sprecher-sammeln.ts` ohne Wächter im Sammler: 1 ✖, danach ok. Dazu `check-sprecher-wikipedia-anzeige`, `check-sprecher-anisearch`, `npx tsc --noEmit` grün.

**Bekannt, nicht angefasst:** `rowspan` in Datenzeilen (Conan: Shinichi Kudo teilt Tobias Müllers Zelle) wird weiter nicht auf Folgezeilen ausgedehnt — Lücke, keine falsche Angabe.
