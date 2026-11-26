<!-- titel: fix(daten): kein 'Sprache offen' und kein ≈, wo Deutsch und Folgenzahl belegt sind -->

Zweig `fix/kalender-sprache-offen` (Basis origin/main, Commit 23931970).

## Ursache

1. **„Sprache offen“ + Hinweis:** `pipeline/lib/meldungen.ts` (`sprachHinweis`) legt Termine aus Meldungen ohne Sprachzusage mit `sprache: 'offen'` und dem Hinweis „Termin laut Quelle – ob mit deutscher Synchro …“ an (Phase 05/08). Später belegt die Netflix-Erweiterung den deutschen Ton an derselben Adresse (`streams[].dub: true`), aber nichts nahm die Kennzeichnung zurück: Kalenderkarte „Synchro offen“, Panel-Pille „Deutsch“ und Hinweis standen zugleich (Call of the Night 141391).
2. **JoJo Steel Ball Run 2nd–3rd Stage (210482):** Netflix-Original, `deErstausgabe.synchro: true`, aber der Netflix-Weg ist nur geteilt (`sharedWith: 2`) und trägt kein `dub` → Panel „Sprache offen“, obwohl die erste Staffel an derselben Adresse `dub: true` hat.
3. **≈:** `folgenAngabe` (letzter Zweig) und `fertigAntwort` kennzeichneten die Werkszahl immer als ≈, auch wenn ein Release des Anbieters die Zahl belegt (`episodeCount`, nicht angenommen, nicht nur gesichtet — Call of the Night: 13 belegt).
4. **Erklärsatz im Hauptkasten:** `KastenPillen` zeigte die Legende („≈: Zahl des Werks …“, „laut JustWatch“) als Satz unter den Pillen.

## Klasse (gemessen an `public/data`, Stand origin/main)

- Termine mit belegtem Deutsch, aber `sprache: 'offen'` oder Unsicherheits-Hinweis: **3** — `auto-141391-netflix`, `auto-10021751-netflix`, `demon-slayer-entertainment-district-arc-primevideo` (Handeintrag, Weg an derselben Amazon-Adresse `dub: true`). Alle drei geschlossen (Schnellweg unten).
- Nicht betroffen, bewusst: `demon-slayer-mugen-train-arc-primevideo` (Weg liegt an anderer Amazon-Adresse; belegt diesen Termin nicht), `auto-156040`, `auto-103631`, `auto-180829`, `auto-c204084`, die vier Hashira/Swordsmith-Termine (kein Weg mit Beleg).
- Netflix-Originale mit Synchro-Marke, deren Netflix-Weg kein `dub` trägt: **1** (`steel-ball-run-2nd-3rd-stage`), geschlossen.
- ≈ bei belegter Zahl: Obergrenze **183** Pillen (Weg `dub: true` ohne Bereiche, Release-Zahl belegt und ≥ Werkszahl); ≈ erscheint dort nur, wo der Titel als abgeschlossen gilt. Alle fallen über die neue Regel.
- Erklärsätze im Hauptkasten: **1 Stelle** (Legende), verschoben.

## Ansatz

- `pipeline/lib/deutsch-belegt.ts` (neu): eine Urteilsregel `istDeutschBelegt` (Weg `dub: true`, nicht abgeleitet, an der Adresse des Termins; oder Netflix-Original mit Synchro) und der Wächter `deutschBelegtTrotzOffen`.
- `pipeline/bau/deutsch-belegt-klaeren.ts` (neu), eingehängt in `pipeline/bau/09-synchro.ts` nach den Nein-/ADN-Kennzeichnungen und vor den Ereignissen (Phase 10): nimmt `sprache: 'offen'` und die Hinweise aus `SPRACH_NOTIZEN` zurück; `omu` und eigene Hinweistexte bleiben; setzt `dub: true` am Netflix-Weg einer Netflix-Eigenproduktion mit Synchro.
- `pipeline/lib/meldungen.ts`: `SPRACH_NOTIZEN` exportiert (eine Quelle für die Hinweistexte).
- `pipeline/lib/pruefung.ts`: Wächter `deutschBelegtTrotzOffen` in `schlussFehler` (bricht den Bau bei Wiederkehr).
- `web/src/components/detail/antwort-regeln.ts`: `reichtBis` exportiert; `fertigAntwort` zählt eine belegte Release-Zahl als Beleg.
- `web/src/components/detail/folgen-angabe.ts`: ≈ nur, wo kein Release des Anbieters die Zahl belegt.
- Legende: `antwort-kasten-teile.tsx`, `antwort-kasten.tsx`, `antwort-kasten-props.ts`, `antwort-bereich.tsx` (Prop und Satz entfernt), `web/buehne/mockups/kalender-wuensche-bereiche-teile.tsx` (Kopie des Satzes entfernt); neu `panel-koerper.tsx` (`legendeVon`) und `Quellenuebersicht.tsx` (zeigt die Legende im aufgeklappten Abschnitt „Woher diese Angaben stammen“).
- `pipeline/check-deutsch-belegt-klaeren.ts` (neu), `tools/check-logic-liste.txt` (Eintrag), `pipeline/check-folgenzahl-kennzeichnung.ts` (drei Fälle), `data/patchnotes/kein-synchro-offen-bei-belegtem-deutsch.yaml`.
- Datenkorrektur nur im Bau, nichts in `data/cache/`; `public/data/*` entsteht beim nächsten Bestandsbau (hier ohne `data/cache` nicht neu erzeugbar).

## Beleg

Schnellweg (`klaereDeutschBelegteTermine` und Wächter auf den echten `public/data/releases.json` + `titles.json` der Basis):

- **Rot (Basis):** `VORHER Wächter: 3 demon-slayer-entertainment-district-arc-primevideo, auto-141391-netflix, auto-10021751-netflix`; JoJo-Weg `dub: undefined`.
- **Grün:** `NACHHER Wächter: 0`; JoJo-Weg `dub: true`; Call of the Night `sprache`/`hinweis` beide `undefined`.
- `check-deutsch-belegt-klaeren.ts`: Basis grün; Mutationsprobe 7 von 7 getötet (dubAbgeleitet-Prüfung, Adresse, Hinweis bleibt, offen bleibt, omu-Ausnahme des Wächters, Disc, Original-Prüfung). Ein erster Lauf ließ den omu-Mutanten überleben — Testfall nachgeschärft.
- `check-folgenzahl-kennzeichnung.ts`: neue Fälle rot an der Basis (2 Fehler beim Zurückstellen der Änderung), grün jetzt; 2 Mutanten getötet.
- Weitere Läufe grün: `check-dub-anbieter-pille`, `check-prime-kanal`, `check-herkunft-je-folge`, `check-deutsche-folgenzahl(-hinweis)`, `check-pille-nur-untertitel`, `check-schwester-shop`, `check-nein-sprache-offen`, `check-adn-sprache-offen`, `npx tsc --noEmit -p .`, `npm run check:umfang` (zwischenzeitlich rot: `PanelKoerper` über 80 Zeilen → `legendeVon` ausgelagert).
- **Nicht belegt:** Screenshots beider Themen (Bühne). Diese Cloud-Sitzung hat weder `data/cache` noch darf sie einen Server starten; Abnahme nach dem Bestandsbau: Call of the Night (141391) und JoJo (210482) öffnen, Kopf „Deutsch“, kein „Synchro offen“, kein ≈ bei „13 Fg.“, Legende nur unter „Woher diese Angaben stammen“ aufgeklappt.

## Warum die Prüfungen es durchließen

- Bestehende Wächter (`deutschNurAusSpracheTermin`) prüften nur „alle Termine eines Anbieters tragen Sprachkennzeichnung und der Weg ist deutsch“; ein einzelner Termin mit `offen` neben belegtem Weg fiel nicht auf. Kein Wächter verglich Release-Kennzeichnung mit dem später entstandenen Weg-Beleg — jetzt `deutschBelegtTrotzOffen`.
- Die Legenden-/≈-Tests prüften nur Bereiche und Wochenplan, nie den Fall „Release belegt die Zahl“; Prüfer sahen den Kasten nur mit Fixtures ohne Release-Zahl. Neu: drei Fälle in `check-folgenzahl-kennzeichnung.ts`.
- Das Design-Regelwerk (Abschnitt 13) nennt Maße, aber kein Verbot von Erklärsätzen im Hauptkasten; Schärfung als Vorschlag im Bericht.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
