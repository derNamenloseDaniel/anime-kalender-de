# Bericht: selbstbestätigende Wachen (26.11.2026)

**Ergebnis:** Sieben Bestandswachen prüfen jetzt zusätzlich gegen den Vorstand (eingecheckter Stand, `HEAD`, `--vorstand <ref>`): geteilte Seiten Crunchyroll und Prime, Cartoon-Staffeln, Cartoon-Wege, Cover-Lücken, ADN-Kennung, Reihen-Namen, Neuverfilmungen. Gemeinsamer Baustein `pipeline/lib/vorstand-abgang.ts` (Abgang ohne Grund, Freigabeliste für gewollte Regeländerungen).
**Beleg:** Je Wache ein Test, der Soll und Ist zugleich streicht; gegen die Basis rot, jetzt grün. Am Verlauf ab 09.11. (703 Bestandsbauten) einziger echter Treffer: Kitaro-Coververlust 15.11. (richtig), dazu PR 3018 (gewollte Regeländerung → Freigabe). Vier Fehlalarme im Verlauf führten zu geschärften Regeln.
**Offen (nicht umgestellt, mit Grund):** `check-anisearch-dubletten-bestand` (Soll ist eine Paarfindung, kein Bestand; braucht Neufassung wie nur-omu oder Handliste), `check-cartoon-zwilling-bestand` (Vorstand-Regel wäre leer: 0 übernommene Anbieter an 21 Zwillingen), `check-anisearch-katalog-abgleich-bestand` (teils, Handliste deckt).
**Klasse, nicht im Auftrag genannt (Analyse, nicht umgestellt):** selbst: `check-folgen-erschienen-bestand` (`hoechsteFolgeJeAnbieter`), `check-folgen-nummern-bestand` (Ausnahmeliste in Bau-Datei, unklar), `check-empfehlung-bestand` (`baueEmpfehlung`), `check-staffel-von-hand-bestand` (gemeinsamer Lader), `check-folgentitel-sprache-bestand` (zwei Drittel); teils: `check-cartoon-news`, `check-horizonte-staffeln-bestand`, `check-saison-deutsch-bestand`, `check-staffelzaehlung-bestand`, `check-toggo-seiten-bestand`. Vorschlag: je eigener PR nach demselben Muster.
**Schätzung vs. Ist:** geschätzt 2 h, Ist ≈ 1 h 05 min (23:07–00:12). Prozesse: keine übrig. Code: Zweig `fix/selbstbestaetigende-wachen` (kleine Commits, zwei davon Umbau).

**Rückblick**
- gut: Verlauf aus 703 Bestandsbauten als Probe vor dem Scharfschalten; vier Fehlalarme vorab gefunden statt im Bestandsbau.
- schlecht: Vorstand-Wachen ohne Freigabeweg hätten jeden gewollten Regelwechsel dauerhaft rot gemacht; erst der Verlauf (PR 3018) zeigte das.
- unerwartet: Mehrere Kulissen-Tests liefen ohne Git; jede Vorstand-Wache braucht dort jetzt einen leeren Commit.
- Vorschlag: neue Bestandswache mit vom Bau geschriebener Soll-Liste nur mit Vorstand-Prüfung (Baustein `vorstand-abgang.ts`) und Verlaufsprobe; Freigaben nach dem nächsten Bestandsbau streichen.
