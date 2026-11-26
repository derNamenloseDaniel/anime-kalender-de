<!-- titel: Fool Night: Netflix-Komplettstart wird als Katalog-Release hervorgehoben -->
## Was sich ändert

Fool Night (ONA, Netflix, alle 12 Folgen am 26.11.2026) erscheint im Kalender jetzt als „Katalog-Release ≈“ (alle Folgen auf einmal, vermutlich), nicht mehr als gewöhnlicher Termin. Beleg für den Komplettstart: [streamwert.de „startet am 26. November komplett“](https://streamwert.de/2026/11/07/fool-night-anime-netflix-start-26-november/), [filmstarts.de „Heute startet …“](https://www.filmstarts.de/nachrichten/1000233902.html) (beide über WebSearch gefunden, Seiten selbst nicht abrufbar: Host in der Cloud gesperrt).

## Fünf Stufen (Fehlermeldung von Daniel, 26.11.2026 21:07)

- **(a) Ursache:** Der Termin ist ein automatisch übernommener Netflix-Batch (`auto-10021751-netflix`) aus einer Meldung ohne Folgenzahl. `zeitplanAusVorschlag` (`pipeline/lib/meldungen.ts`, letzter `return`) setzt `episodeCount` nur aus `v.folgen`; `istBatchAmStueck` (`shared/katalog-release.ts:36-39`) verlangt `episodeCount >= 3`. Das Release hatte keine Zahl, obwohl AniList 12 Folgen und das Ende am Starttag führt.
- **(b) Klasse:** gemessen auf `public/data` (main): 1 Fall (Fool Night). Alle anderen Batch-Termine ohne Zahl und mit AniList-Folgen ≥ 3 sind alte Serien mit Katalogzugang (jpEnd 2008–2024; auto-166216, auto-141391, auto-3231), kein Komplettstart. Batch mit Zahl ≥ 3 ohne Katalogmarke: 310 „im Angebot seit“ (gewollt) und 2 Handdatei-„teil“ (Beelzebub, Gachiakuta), beides gewollt.
- **(c) Schließen:** `komplettstartZahl` (`pipeline/lib/komplettstart-zahl.ts`) liefert die AniList-Zahl, wenn Plattform Netflix, Format ONA und AniList-Ende = Starttag zusammenfallen; der Wert ist belegt (kein erfundener), die Marke bleibt `abgeleitet` („Vermutlich …“). Eine Datenkorrektur in `data/` ist nicht nötig.
- **(d) Wächter:** `pipeline/check-katalog-release.ts`, Abschnitt `komplettstart()`: Meldung → Zeitplan → Termin → Katalogmarke, mit vier Gegenproben (Ende später, kein ONA, anderer Anbieter, unter 3 Folgen). Mutationsprobe: Regel ausgehoben → Hauptfall rot; Ende-Prüfung entfernt → Gegenprobe „Ende erst später“ rot. Eine eigene Bestandsprüfung entfällt, da die Klasse 1 Fall umfasst.
- **(e) Warum durchgelassen:** Der Test `check-katalog-release.ts` baute seine Termine von Hand mit `episodeCount` und prüfte nur „Batch ohne Zahl ist kein Katalog“ (Gegenfall A Wild Last Boss). Der Weg Meldung → Zeitplan → Katalog war nie am echten Titel durchgespielt, und die Bestandsprüfung zählt nur vorhandene Marken, nicht fehlende. Geschärft: Katalog-Tests gehen künftig vom Zeitplan der Meldung aus (`zeitplanAusVorschlag`), nicht von einem fertigen Termin.

## Schnellweg-Beleg (echter Titel 213457 aus `public/data/titles.json`)

- vorher: `{"schedule":{"firstEpisodeDate":"2026-11-26"}}`, Marke: keine
- nachher: `{"schedule":{"firstEpisodeDate":"2026-11-26","episodeCount":12},"katalog":"abgeleitet","episodeCount":12}`

## Geprüft

`check-katalog-release.ts`, `check-meldung-cartoon.ts`, `npx tsc --noEmit -p .`, `check:umfang`, eslint der drei Dateien, `mutationsanker --diff`: alle Exit 0. Öffentliche Daten (`public/data`) erst nach dem nächsten Bestandsbau auf main sichtbar; danach live prüfen: Woche 23.–29.11., Kachel Fool Night am 26.11.

## Nebenbefund (nicht Teil dieses PR)

Das Release trägt `sprache: "offen"` und den Hinweis „ob mit deutscher Synchro, ist dort noch offen“, obwohl der Titel `dub: true` / `deErstausgabe.synchro` führt und Netflix inzwischen mit Synchro gestartet ist; nachsehen, ob der Hinweis nach Erscheinen entfallen sollte.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqJtkzg3oN89TNVaXk
