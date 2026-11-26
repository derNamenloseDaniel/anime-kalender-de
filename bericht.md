# Bericht: mighty-nein-staffeln (F157, Teil B)

1. Geprüft: Teil B lief nirgends (kein offener PR, keine Aktivierung in `git log`); PR 5079 und 5072 sind gemergt, 4897 gemergt und geschlossen.
2. Geliefert: Wächter `zusammengelegteStaffeln` (Titel mit Staffelgrenzen ohne `basis`, spätere Staffel mit eigener Ankündigung oder laufend) plus Anschluss im Bestandsprüfer.
3. Klasse gezählt: vorher 1 Fund (Mighty Nein), nachher 2 (dazu Horizonte Staffel 4, vorher durch die Ausnahme „hat Grenzen“ unsichtbar); beide in `BEKANNT`.
4. Basis-Beleg: neuer Test gegen main rot (Exit 1, fehlender Export), danach grün (Exit 0); `diff-mutanten` 31 Mutanten, 0 überlebt; `tsc --noEmit` grün.
5. Nicht geliefert: Aktivierung von Horizonte (`basis`, `kennung`, `zuAk`, `ak-umleitung.json`) und der Cartoon-Schnitt für Mighty Nein; der Bau läuft in der Cloud nicht („data/cache/ ist leer“), ein blinder Schnitt gefährdet den Bestandsbau.
6. Nächster Schritt: ein Lauf mit Cache (Bestandsbau-Zweig oder lokal) für beide Aktivierungen, Plan in `daniel-zum-abarbeiten/berichte/staffel-titel-plan.md`.

Rückblick
- gut: Der Wächter machte die Klasse sichtbar (Horizonte war versteckt) und schloss 10 überlebende Mutanten mit Fällen.
- schlecht: Der Kern des Auftrags (zwei Titel mit Reiter) bleibt offen; die Cloud kann ihn nicht belegen.
- unerwartet: `wip/cartoon-staffel-schnitt-lokal`, auf das der Plan verweist, gibt es auf dem Server nicht; Cartoons haben keinen Schnitt-Code.
- Vorschlag: Cartoon-Schnitt als eigenen Auftrag mit lokalem Cache; vorher den Zweig `wip/cartoon-staffel-schnitt-lokal` pushen.
- veraltet: Kommentar in `check-staffel-ohne-seite-bestand.ts` nannte „Cartoons ohne Staffelgrenzen-Yaml“ nur für Mighty Nein; jetzt zwei Gründe.
