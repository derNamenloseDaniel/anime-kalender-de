# Bericht Nachbesserung PR 5016
- Befund 1: Ursache ist `werkTitel()`, das „– Staffel 2“ abschneidet; Eintrag 10017229 auf „Pacific Rim: The Black“ gesetzt, Prüfung unverändert.
- Hinweis 2: Negativbehauptung in 3 Notizen auf „Quellen nennen keinen abweichenden Titel“ umformuliert.
- URLs 15201/104382/104990 nicht prüfbar (Hosts in der Cloud gesperrt); de.wikipedia 200, Anime2You 403 (Proxy).
- origin/main eingemergt; `check:bestand` nicht lokal gefahren (braucht Neubau), CI entscheidet.

Rückblick
- Gut: Schnellweg per `werkTitel()` zeigte die Ursache sofort.
- Schlecht: URL-Prüfung scheitert an der Netzsperre der Cloud.
- Unerwartet: Prüfung vergleicht rohen Handtitel mit Ausgabe, nicht mit `werkTitel()`.
- Vorschlag: `ladeTitelDe`/Validierung warnt, wenn ein Handtitel durch `werkTitel()` verändert würde.
- Veraltet: nichts.
