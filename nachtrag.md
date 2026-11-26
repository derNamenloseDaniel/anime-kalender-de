Nachtrag zu Prüfer-Review (Kopf 581635248), umgesetzt in 5efcd6662:

1. Fehler 1 nur per Regex belegt -> `extension/amazon-auftrag-seite.test.cjs` lässt `zeigeAuftragshinweis()` laufen (ohne zielAsin: fremder Titel -> false, gleicher/erweiterter Titel -> weiter, mit zielAsin unverändert); Beleg: Test grün, gegen die Basis (`deb1d004^`) rot bei 4 Zusicherungen („fremder Seitentitel: ausgeblendet", „kein Name passt", „Takt … Titelbauer, dann leere Hülle", „Takt … Suchbauer, dann Hülle").
2. Takt-Verdrahtung nur per Regex -> derselbe Test führt den Takt-Block aus amazon.js aus (Adresse neu ohne Auftrag -> Hülle; Bauer baut neu -> keine zweite Hülle; Suchseite; gleiche Adresse -> nichts).
3. Mutationsproben nur Behauptung -> `tools/mutationen/amazon-auftrag-seite.json`, 9 Mutanten (Vergleich nur mit zielAsin, nie, Suchbegriffe zählen nicht, `some` statt `every`, Aufruf weg, Hülle nicht gerufen, falsche Adresse, Bauer vertauscht, Helfer ruft immer Hülle): 9 rot, 0 überlebt, Kontrolle grün.
4. Risiko abweichender Prime-Name -> ohne zielAsin zählen jetzt auch `suchbegriff`/`suchbegriffEn` der Suchliste als Name; ausgeblendet wird nur, wenn keiner zur Seite passt (Test „Das Geheimnis von Gegege" gegen „Mystery of GeGeGe"). Echte Amazon-Seite bleibt ungemessen (kein Zugriff), Stichprobe in `public/data/prime-suche.json` hat nur 2 Aufträge.

Lehre: Eine Verdrahtung oder Entscheidung in amazon.js belegt nur ein Test, der die Funktion bzw. den Block mit Stellvertretern ausführt (schneide + new Function), nie ein Regex auf den Quelltext.
