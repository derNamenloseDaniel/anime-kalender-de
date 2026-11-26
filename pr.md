<!-- titel: fix(erweiterung): Netflix-Termin aus 'Ab <Datum>' nicht mehr verwerfen, Banana Fish 10.12. -->

## Ursache

Banana Fish (AniList 100388): Netflix zeigt „Ab 10. Dezember“, die Erweiterung meldete „Erinnern-Knopf ohne Datum“ und stellte den Titel 7 Tage zurück (bis 29.11.). `erscheinungsdatum()` (`extension/melder.js`) verlangte `\bAb` mit großem A; jede andere Schreibung ergab `null`, und `akNetflixErinnernGrund(null)` schrieb „ohne Datum“. Die Seite selbst wurde nicht gemessen (kein Netflix-Abruf); dass die Schreibung der Auslöser war, ist die einzige Lesart, die den Befund mit dem Code erklärt, aber **nicht an der echten Seite belegt**. Die Annahme im Auftrag, `akNetflixErinnernZurueckstellen` verwerfe ein gelesenes Datum, trifft nicht zu: Der Aufruf in `melden()` steht hinter `!erscheinungsdatum()`, ein Datum liegt dort nie vor; der Durchgang (`akNetflixListeWarten`) reicht es schon durch. Verloren ging es also im Leser.

## Änderung

- `extension/netflix-erinnern.js`: neuer `akNetflixTerminLesen(text)` (Schreibung egal, Monat muss lesbar sein, „ab 5. Folge“ ist kein Termin).
- `extension/melder.js`: `erscheinungsdatum()` nutzt ihn; die Meldung `erscheint` und der Zurückstell-Grund nehmen damit denselben Wert (vorhandener Meldeweg, nichts Neues).
- `extension/eslint.config.mjs`: neuer Global.
- `extension/netflix-termin-lesen.test.cjs`: neuer Wächter (Fixture-Texte, festes `JETZT` 26.11.2026 18:42 UTC): „Ab/ab/AB 10. Dezember“, Seitentext ohne Dialog, Gegenfälle, Grund „mit Datum (10.12.)“, Frist bis 10.12. 00:00 Berlin.
- `extension/netflix-erinnern-grund.test.cjs`: Harness reicht den neuen Global an die ausgeschnittene Funktion.
- `data/patchnotes/netflix-termin-ab-datum.yaml`: Patchnote.
- Manifest-Version nicht angehoben (zählt `extension-version.yml`, CLAUDE.md/bauer.md).

## Klasse

Gemessen im Repo: 1 Leser (`erscheinungsdatum()`), 1 Schreibweise-Annahme. Wie viele Titel auf Daniels Profil mit „ohne Datum“ zurückgestellt sind, liegt in `chrome.storage` je Browser und ist im Repo nicht messbar (0 Fälle belegbar). Nach dem Update den Durchgang erneut laufen lassen; alte 7-Tage-Einträge laufen von selbst ab.

## Quellen / Daten

Netflix-Start 10.12.2026 für Deutschland: **nicht belegt**. Gefunden: Netflix-Start 12.08.2026 in USA/CA/UK/IE/FR mit neuer EN/FR-Fassung (whats-on-netflix.com, animecorner.me); nudlaug.eu (11/2026, Titel „Deutsche Tonspur liegt bei Netflix schon bereit, in AT und DE noch nicht offiziell“, nur als Suchtreffer gelesen, Host im Cloud-Netz gesperrt) nennt keinen Termin. Daher **keine Release** in `data/curated` (Regel: kein Termin ohne Quelle); `dub-confirmed.yaml` führt die Netflix-Adresse 81218604 weiter als „toter Verweis“ (21.10.2026) — Daniels Screenshot ist kein öffentlicher Beleg. Offen: Quelle für 10.12. und Synchro.

## Beleg

Rot an der Basis (altes `melder.js`, neuer Test): 3 ✗ (kleingeschrieben, GROSS, Grund „mit Datum“ …). Grün mit Fix: 0 ✗; `tools/extension-tests.mjs` grün, `npx tsc --noEmit -p .` 0, `check:umfang` 0, eslint sauber.

## Warum die Prüfungen es durchließen

Die Tests deckten nur die Schreibung „Ab 19. November“ ab (`netflix-erinnern-grund.test.cjs`); Fixtures stammen aus eigener Annahme, nie aus einem Mitschnitt der Seite. Schärfung: Leser fremder Seitentexte brauchen Fixtures in mehreren Schreibungen (jetzt `netflix-termin-lesen.test.cjs`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
