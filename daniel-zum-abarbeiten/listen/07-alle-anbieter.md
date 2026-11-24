# Prüfliste: Wo läuft es wirklich auf Deutsch?

Stand 2026-11-24 · **15 offene Verweise** in **14 Zeilen**.

Erzeugt von `npm run data:dub-checks`, **nicht von Hand pflegen**. Was geprüft ist, gehört
nach `data/dub-confirmed.yaml`; beim nächsten Lauf verschwindet es hier.

**Eine Zeile ist eine Reihe auf einem Anbieter.** Wer den Verweis öffnet, sieht dort in aller
Regel alle Staffeln auf einmal und kann sie auch auf einmal beantworten. In der letzten Spalte
steht, welche Einträge dieser Reihe dort noch offen sind — bereits Bestätigtes fehlt dort.

Sortiert von heute in die Vergangenheit, ausschließlich Titel, die es schon gibt.

Zum Abarbeiten gibt es dieselben Zeilen in `dub-batches.md` — nach Nutzen sortiert und in
Paketen zu je zwanzig.

## Wie geantwortet wird

Kurzschrift, damit ein Batch in einer Zeile beantwortet werden kann (Daniel, 12.08.2026):

| Zeichen | Bedeutung | wird zu |
|---|---|---|
| `1` | hat deutsche Synchro | `dub: true` |
| `0` | keine deutsche Synchro, nur Untertitel | `dub: false` — Verweis bleibt mit ✕ |
| `x` | kein Video: nicht verfügbar, Verweis tot, Weiterleitung | `available: false` — Verweis wird entfernt |

Stehen in einer Zeile **mehrere** Einträge zum Prüfen, werden die Ergebnisse mit Punkt
getrennt in derselben Reihenfolge angegeben: `1.0` heißt „erster Eintrag ja, zweiter nein".
Eine **einzelne** Angabe gilt für alle Einträge der Zeile.

Beispiel: `1-x 2-1 3-1.0 4-x` — Zeile 1 tot, Zeile 2 Synchro, Zeile 3 erster Eintrag
Synchro und zweiter ohne, Zeile 4 tot.

| Offen je Anbieter | Verweise |
|---|---|
| [Prime Video](07-primevideo.md) | 9 |
| [Disney+](07-disneyplus.md) | 3 |
| [Netflix](07-netflix.md) | 2 |
| [Pluto TV](07-plutotv.md) | 1 |

## Zu prüfen

| # | Datum | Reihe | Noch zu bestätigen |
|---|---|---|---|
| 1 | 2026-10-10 | Demon Slayer: Kimetsu no Yaiba | [Mugen Train Arc](https://www.amazon.de/gp/video/detail/B0HLPQXSLK) · [Entertainment District Arc](https://www.amazon.de/gp/video/detail/B0D65Q2GCW) |
| 2 | 2026-10-06 | My Hero Academia | [Vigilantes Staffel 2](https://www.netflix.com/title/82036361) |
| 3 | 2026-09-26 | Welcome to Demon School! Iruma-kun | [Staffel 4](https://www.disneyplus.com/browse/entity-b042544d-cd7d-40c6-9be4-db79666a1b51) |
| 4 | 2026-01-01 | There’s No Freaking Way I’ll Be Your Lover! Unless… | [Episoden 13-17](https://www.amazon.de/gp/video/detail/B0F5HDQBTM) |
| 5 | 2020-06-26 | Titipo: Der kleine Zug | [Titipo Titipo 2](https://www.netflix.com/title/81099976) |
| 6 | 2020-06-26 | Titipo: Der kleine Zug | [Titipo Titipo 2](https://www.amazon.de/gp/video/detail/B0FVF9T7ZP) |
| 7 | 2020-04-04 | My Hero Academia | [4](https://www.disneyplus.com/browse/entity-6c1cfdcd-a3b1-428a-8fe9-aa917d5b6371) |
| 8 | 2019-12-13 | Dr. Stone | [Hauptserie](https://pluto.tv/gsa/shows/dr-stone/) |
| 9 | 2019-01-04 | Made in Abyss | [Die Reise beginnt](https://watch.amazon.de/detail?gti=amzn1.dv.gti.39d00227-3d19-4bc7-9759-57c324715cb3) |
| 10 | 2018-02-10 | Code Geass: Lelouch of the Rebellion | [Überschreitung](https://watch.amazon.de/detail?gti=amzn1.dv.gti.d6bb7dff-f1d9-2164-4efe-b91aff5a4433) |
| 11 | 2012-01-26 | Bakugan: Spieler des Schicksals | [Bakugan: Mechtanium Surge](https://watch.amazon.de/detail?gti=amzn1.dv.gti.05a1129f-4c35-4e68-ba66-88466758e697) |
| 12 | 2009-03-27 | Black Butler | [Hauptserie](https://watch.amazon.de/detail?gti=amzn1.dv.gti.6aad68c8-1e46-46e9-be1e-3d4de43488a5) |
| 13 | 2005-01-30 | Pretty Cure | [Hauptserie](https://www.disneyplus.com/de-de/browse/entity-1d36fbbe-0a91-468e-ac73-8d51337195fa) |
| 14 | 2003-10-22 | Ikki Tousen: Dragon Girls | [Hauptserie](https://watch.amazon.de/detail?gti=amzn1.dv.gti.1374d3dd-9d96-4d41-b0f8-38932f0c9145) |

## Warum die einzelnen Anbieter unsicher sind

- **Disney+:** Disney+ hat keine öffentliche Schnittstelle; die Sprachwahl steht nur im Player.
- **Netflix:** Netflix veröffentlicht keinen maschinenlesbaren Katalog; die Sprachliste steht nur im eingeloggten Player.
- **Pluto TV:** —
- **Prime Video:** Prime Video nennt die Tonspuren erst auf der Produktseite, und die ist ohne Anmeldung unvollständig.
