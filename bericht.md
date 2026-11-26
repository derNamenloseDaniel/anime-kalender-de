# Bericht kalender-n7-tokyo-revengers

- Freitag ist belegt (Start 02.10. = Freitag, offizielle Seite Fr 19:00 MESZ); Anime2Yous „samstags“ widerspricht dessen eigenem Starttag. Hinweis in `data/curated/streaming-herbst-2026.yaml` bereinigt, Quelle ergänzt.
- 18:00 MEZ ab 30.10. bleibt abgeleitet (≈), kein Beleg: offizielle Seite und Disney-Presse aus der Cloud nicht abrufbar.
- Klasse: 5 von 50 Hinweisen nennen Tag/Uhrzeit, 1 Widerspruch live (Tokyo Revengers).
- Neuer Wächter `hinweisGegenTermin` (Zweig fix/kalender-n7-tokyo-revengers, Kopf 772b3d98b, main eingemergt): Test rot gegen main, grün mit Fix; Mutationsprobe rot; tsc, eslint, Umfang grün.
- Offen: `public/data` zeigt den alten Hinweis bis zum nächsten Bestandsbau; Grenze sinkt dort 1 → 0. Kein PR angelegt.

## Rückblick
- **gut:** Die Plausibilitätsregeln ließen sich rein erweitern; `--liste` zählte die Klasse am echten Bestand in Sekunden.
- **schlecht:** WebFetch kam nicht an offizielle Seite, Disney-Presse und fernsehserien.de; WebSearch-Snippets sind nur Hinweise, keine Belege.
- **unerwartet:** Anime2Yous „samstags“ ist intern widersprüchlich (Start 02.10. war Freitag).
- **Vorschlag:** `press.disneyplus.com` und `tokyo-revengers-anime.com` in der Umgebung freigeben, dann 18:00-MEZ-Takt direkt belegen.
- **veraltet:** Der Nachtrag-Text im Release („prüfen am 09.10.“) ist Chronik, nicht angepasst (News nie umschreiben).
