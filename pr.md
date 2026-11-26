<!-- titel: AniList-Banner weicht dem TMDB-Banner der Reihe (bild-fremdsprachig) -->
Auftrag: maengel-bild-fremdsprachig

## Was ändert sich
Titel, die nur ein AniList-Banner (Key Visual, meist mit japanischer Schrift) tragen, zeigen jetzt das TMDB-Banner eines anderen Teils ihrer Reihe, wenn es eines gibt (textlos vor deutsch vor englisch). Neu `ersetzeAnilistBanner` in `pipeline/bau/banner-franchise.ts`, aufgerufen in `pipeline/bau/11-wege-abschluss.ts` nach `uebernehmeFranchiseBanner`; Kennzeichnung wie dort mit `bannerVon`. Wächter `pipeline/check-banner-ersatz.ts` (in `tools/check-logic-liste.txt`), Patch-Notes-Entwurf `data/patchnotes/vorrat/hintergrundbild-ohne-japanische-schrift.yaml`, Befund in `docs/wissen/maengel.md`.

## Zahlen
- Offene Zeilen `bild-fremdsprachig` vorher: **509** (315 Ausnahmen, Mängel-Werkzeug, 26.11.2026). Nachher: nach dem nächsten Bau erwartet rund 250 weniger. Hochrechnung an dem veröffentlichten Titelbestand mit der echten Funktion und `fremdeBilder`: 527 → 274 offen (Rechnung ohne Cache und ohne geteilte Filme, deshalb 527 statt 509), 399 Banner ersetzt.
- Ursache der 509: 238 Cover = TMDB-Plakat `ja` ohne `nurJa` (Altbestand; Reparatur PR 4790 wirkt erst nach dem Plakat-Lauf, alle 98 mit Kennung stehen im ersten Lauf unter dem Deckel 800, 140 über die Staffelsuche), 348 Titel mit AniList-Banner. Davon haben 331 einen Teil derselben Reihe mit eigenem TMDB-Banner im Repo.
- Cover-Frage: Der Plakat-Bestand speichert nur das gewählte Bild, ein falsch gewähltes deutsches oder textloses Plakat ist dort nicht ablesbar. Die Folge de → en → ohne Sprache → ja ist richtig; hier unverändert.

## Basis-Beleg
Neuer Test gegen die main-Fassung rot: `TypeError: franchise.ersetzeAnilistBanner is not a function`, Exit: 1. Mit der Änderung grün, Exit 0. Berührt und grün: die Banner- und Mängel-Regeltests, `npx tsc --noEmit -p .`.

## Mutationstabelle (Diff-Mutanten mit dem neuen Test)
26 Mutanten, 24 getötet, 2 überlebt: beide an `log(...)` in Zeile 71 (Protokollzeile, ohne Wirkung auf die Daten). Ein dritter Überlebender (Zeile 60, mehrere Spender) ist durch den Fall „zwei Spender“ getötet.

## Annahmen
- Die Sprache eines TMDB-Banners steht nicht im Bestand; ein reines `ja`-Hintergrundbild wäre selten und gälte trotzdem als lesbar.
- Ersetzt wird jedes AniList-Banner mit Spender, auch die, die schon als Ausnahme galten (TMDB-Eintrag `null`), damit ein Titel nicht ein Key Visual behält, obwohl die Reihe ein TMDB-Banner trägt.
- Nicht gebaut: die 66 Reihenserien (Special, OVA, ONA) mit Plakat `ja` ohne eindeutige Staffel; sie brauchen Handrecherche.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zpwiYBZqMiL5JpvsS2
