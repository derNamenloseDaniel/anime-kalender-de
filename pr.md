<!-- titel: Kalender N7: Tokyo-Revengers-Hinweis ohne Quellenstreit, Wächter Hinweis gegen Termin -->
Auftrag: kalender-n7-tokyo-revengers

## Was ändert sich
- `data/curated/streaming-herbst-2026.yaml`: Der Hinweis zu Tokyo Revengers S3 (Disney+) nennt nur noch Freitag und die Uhrzeit-Ableitung; Quelle ergänzt (Anime2You, 13 Folgen).
- Neue Plausibilitätsregel `hinweisGegenTermin` (`pipeline/lib/kalender-hinweis-termin.ts`, in `check:kalender-plausibilitaet`): meldet Wochentag oder Uhrzeit im Hinweis, die kein Termin daneben trägt (nur ab 3 Terminen).

## Beleg Takt
Freitag stimmt: Start 02.10.2026 ist ein Freitag (Anime2You Episodenanzahl-Artikel: Start 2.10., 13 Folgen); offizielle Serienseite (Handbeleg 04.10.): Disney+ weltweit freitags = 19:00 MESZ; Folge 1 „ab sofort“ am 02.10. 19:55. Anime2Yous „jeden Samstag 19:00“ widerspricht dessen eigenem Starttag. Suche meldete zusätzlich fernsehserien.de (Folge 8 am Fr 20.11.; Seite von der Cloud nicht abrufbar, deshalb nicht als Quelle eingetragen). Ungelöst: 18:00 MEZ ab 30.10. ist Ableitung (≈ bleibt), kein Beleg; offizielle Seite und Pressemitteilung waren aus der Cloud nicht erreichbar (Netzwerksperre).

## Fünf Stufen
(a) Ursache: `data/curated/streaming-herbst-2026.yaml` (Hinweis der Release `tokyo-revengers-s3-disneyplus`) trug beide Aussagen, kein Wächter verglich Hinweis mit Terminen.
(b) Klasse: 50 Releases mit Hinweis, 5 nennen Wochentag oder Uhrzeit (ranma-s3-folge1, tokyo-revengers-s3, auto-213805, pokemon-horizonte-s4, dragon-ball-daima-toggo-plus); mit ≥ 3 Terminen und Widerspruch live: 1 (Tokyo Revengers: samstags). Die anderen vier stimmen oder haben < 3 Termine.
(c) Fix an der Klasse: Regel `hinweisGegenTermin`, Baseline 1 in `tools/kalender-plausibilitaet-grenzen.json`, sinkt mit dem nächsten Bestandsbau auf 0 (Datensatz in `public/data` wird dort neu erzeugt).
(d) Test `pipeline/check-kalender-plausibilitaet.ts` Abschnitt 7 mit Fixture (feste Daten, `HEUTE`); gegen die main-Fassung der Regeldatei rot (`TypeError: Cannot read properties of undefined (reading 'map')`, Exit 1), mit Fix grün (Exit 0). Mutationsprobe: Bedingung `!terminTage.has` umgedreht → 3 ✖, Exit 1.
(e) Warum durchgelassen: Die Hinweise sind Freitext; `check:logic` und Prüfer kontrollierten Termine gegen Quellen, nie den Text gegen die Termine daneben, und der Quellenstreit stand bewusst im Hinweis (Daniel, 04.10.).

## Geprüft
`npx tsx pipeline/check-kalender-plausibilitaet.ts` (0), `npx tsc --noEmit -p .` (0), eslint (0), `tools/umfang-pruefen.mjs` (0).
