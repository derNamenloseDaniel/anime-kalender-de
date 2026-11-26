<!-- titel: Kalender: Folge vor beobachteter Folge gilt als erschienen, belegtBis auch bei Folge > 1 (N1/N2) -->
Auftrag: kalender-n1-n2-geschaetzt

## Was sich ändert
- Neues Eventfeld `vorBeobachtung`: Eine Folge, hinter der eine spätere beobachtet ist, ist sicher erschienen. Ihr Tag bleibt Rückrechnung (`estimated`), aber die Folgen-Pille („1–12“) trägt dafür kein „≈“ mehr (`planGeschaetzt`, `ergaenzungGeschaetzt`).
- `terminGeschaetzt`: `belegtBis` gilt auch bei `firstEpisodeNumber > 1` ohne niedrigere Beobachtung im selben Release (Ranma S3: Folge 1 steht im Schwester-Release).
- Nicht angefasst: verstrichener Katalogstart ohne jeden Gegenbeleg und Folgen nach der letzten Beobachtung (z. B. tank-chair Folge 2–4). Dort bleibt „≈“, denn nichts belegt sie; ein „erschienen“ ohne Zeichen wäre eine Behauptung.

## Fünf Stufen
- (a) Ursache: `shared/logic.ts` `terminGeschaetzt` (`nachBeobachtung` nur im selben Release, kein Weg für „später beobachtet“); `web/src/components/detail/folgen-spanne.ts` `planGeschaetzt` liest nur `estimated`.
- (b) Klasse, gezählt aus `public/data/releases.json` (Stand 26.11.2026): 177 Termine in 3 Releases verlieren das Pillen-„≈“ (black-clover-s2-crunchyroll-synchro, auto-189123-netflix, thunder-3); vergangene geschätzte Termine 81 → 78 (N2, `first > 1`). Rest der 81 (Wochenserien nach letzter Beobachtung, Katalogstarts) bleibt bewusst „≈“.
- (c) Fix an der Klasse (`terminGeschaetzt` + Feld), nicht an Einzelfällen; kein Datenstand angefasst.
- (d) Test `pipeline/check-vor-beobachtung.ts` (fester Tag 26.11.2026, in `tools/check-logic-liste.txt`). Gegen die main-Fassung von `shared/` und `web/` rot: `✖ Pille ohne ≈ …`, `✖ Folge 2–4 sind belegt … gefunden: [true,true,true]`, `3 Zusicherung(en) verletzt.`, Exit 1; mit dem Fix Exit 0. Mutationsprobe: `vorBeobachteterFolge` auf nie-wahr → Exit 1; `first > 1` entfernt → Exit 1. Grün: `check-beleg-bis-anker`, `check-cr-faellig`, `check-herkunft-je-folge`, `check-termin-zustand`, `check-logic`, `tsc --noEmit -p .`, `check:umfang`.
- (e) Warum durchgelassen: `check-beleg-bis-anker` prüfte nur Releases mit Folge 1 im selben Plan und die Pille nur mit Ereignissen eines Releases; keine Zusicherung „Termin vergangen, spätere Folge beobachtet, trotzdem ≈“ und keine mit Schwester-Release. Der neue Test deckt beides.

Patch Notes: keine – intern: Anzeigefeinheit bei drei Serien, für Besucher kaum bemerkbar.

## Hinweis
Offener PR `fix/joyn-folgen-aus-tv` ändert ebenfalls `shared/logic.ts`; hier nur `terminGeschaetzt`, ein Helfer und eine Zeile in `folgenTermine`, keine Umformatierung.
