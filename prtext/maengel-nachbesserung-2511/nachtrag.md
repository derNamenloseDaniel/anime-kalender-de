# Nachtrag zu PR 5016

**Befund 1** (`check:bestand`: „kein Handtitel wurde … durch eine Datenbank ersetzt — 10017229: Pacific Rim: The Black statt Pacific Rim: The Black - Staffel 2“)
**Ursache:** `werkTitel()` (`pipeline/bau/titel-hilfen.ts`) schneidet „– Staffel N“ / „Season N“ absichtlich vom Werktitel ab (Staffelnummer gehört zum Release, nicht zum Werk). `03-2-titel-de-hand.ts` wendet `werkTitel()` auch auf Handtitel an. Der Eintrag mit Zusatz konnte im Datensatz nie so ankommen; die Prüfung vergleicht den rohen Handtitel mit dem Ergebnis. Keine Datenbank hat überstimmt.
**Änderung:** `data/titel-de.yaml`, id 10017229: `titleDe` = „Pacific Rim: The Black“ (gleich wie Staffel 1, 10015835), Notiz angepasst. Prüfung und Code unverändert.
**Beleg (Schnellweg):** `werkTitel('Pacific Rim: The Black - Staffel 2')` → `"Pacific Rim: The Black"`; Datensatz `titles.json` führt 10017229 so bereits (vorher: Eintrag ≠ Ausgabe → rot; nachher: Eintrag = Ausgabe → grün).

**Hinweis 2:** Die Behauptung „einen eigenen deutschen Titel gibt es nicht“ ist in den Notizen zu 111852, 121034, 10017229 ersetzt durch „die genannten Quellen nennen keinen abweichenden deutschen Titel“ (geprüft: de.wikipedia/Dead_or_Bullet 200, Anime2You 403 vom Cloud-Proxy). 
**URLs 15201, 104382, 104990:** nicht erreichbar prüfbar. primevideo, tv.apple, filmdienst, filmstarts sind in der Cloud-Sitzung gesperrt (Host nicht auflösbar). Beim Prüfen bitte lokal öffnen.
