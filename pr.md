# Nachtrag Runde 1

Zweig `feat/tooltips-eigen-statt-title`, Kopf `f7015d395` (Merge von main `25d3b2995` davor). Vorher = origin/main, nachher = Zweig, beide per `vite build` gebaut und aus `dist/` per `page.route` gerendert (kein Server), Playwright headless, feste Zufallsreihe, ruhende Bewegung.

## Auflagen

- **A1 (Handy, Feld „Gesehen bis“)** Ursache: `kindFokus` kannte nur `a`/`button`, die Hülle um `<label>`+`<input>` schluckte nach Touch den ersten Tipp (`useTippVerhalten.beimKlick`: `preventDefault`). Änderung: `kindIstBedienbar` in `web/src/components/ui.tsx` erkennt a, button, input, select, textarea, jedes Kind mit `tabIndex` und ein `<label>` mit solchem Kind; den `aria-describedby`-Verweis bekommt nur das Steuerelement selbst (`kindIstSteuerelement`). Beleg: `pipeline/check-tooltip-bedienung.ts` (Mini-DOM, feste Kulisse): Touch-Tipp auf das Feld in `<label>` wird nicht verhindert; vorher rot (Fall „Feld in <label>“ + `kindIstBedienbar`), nachher grün; Text in der Hülle schluckt den ersten Tipp weiter. Eintrag in `tools/check-logic-liste.txt`.
- **A2 (Knopfreihe der Vorschläge)** Ursache: `.empf-aktionen button:nth-child(2)` und `:not(:nth-child(2))` trafen nach der Hülle jeden Knopf als einziges Kind. Änderung: Klassen `empf-huelle-schmal` (Favorit, Nein) und `empf-huelle-mitte` (Gesehen) an der Hülle, `empf-knopf-mitte` am Gesehen-Knopf; `empfehlung.css:47-49` stellt auf `.empf-aktionen > .empf-huelle-schmal { flex: 0 0 34px }`, `> .empf-huelle-mitte { flex: 1 1 0 }` und `.empf-knopf-mitte { … }` um; `pipeline/lib/aktionen-css.ts` und `pipeline/check-empfehlung-aktionen.ts` (Wächter auf den alten Selektor) mitgezogen, 26 Prüfungen grün. Beleg: Bilder `vorschlaege-*` unten, Selektor-Liste unten.
- **A3 (Vorher/Nachher-Bilder)** Themenknopf (`Header.tsx`), Löschknopf (`Suchfeld.tsx`), Beleg-Knopf (`beleg-dialog.tsx`), Vorschläge (`Vorschlaege.tsx`): je 390, 1024, 1440 px, hell und dunkel, ruhend und mit Zeiger. Der Themenknopf ist unter 768 px ausgeblendet (`hidden md:`), dort gibt es kein Bild. Befunde je Bild: Liste unten.
- **A4 (Wächter)** Ursache: `istTitelTooltip` in `tools/title-tooltips.mjs` sah nur Attribut, Zuweisung `.title =` und `setAttribute`. Änderung: erkennt zusätzlich JSX-Spread eines Objektliterals mit `title` an kleingeschriebenem Element (`{...{ title }}`), `createElement('x', { title })` / `React.createElement`, `el['title'] =`; SVG-`<title>` bleibt erlaubt und wird eigens ausgegeben (Zahl in der Ausgabe von `node tools/title-tooltips.mjs`, aktuell 0). Grenze: ein Spread einer Variablen (`{...props}`) ist nicht auflösbar und bleibt unerkannt; nur Objektliterale. Beleg: `tools/title-tooltips.test.mjs`, 11 neue Fälle plus SVG-Fall, vorher rot (alte Fassung: Fall 1 schlug an), nachher grün; Bestand unverändert 2.
- **A5 (Doku)** Restgrenze 2 (`reihen-reiter.tsx:63`, `staffel-reiter.tsx:80`, `node tools/title-tooltips.mjs --liste`): Nachzug sofort nach dem Merge von PR 5073 bzw. des Staffel-Titel-PR, danach `--festschreiben`, Grenze dann 0. Statt „Leerraum: absichtlich“ gilt: Die Hülle bringt zwei Verhaltensänderungen, (1) ein Tooltip um ein Feld oder `<label>` schluckt den ersten Tipp auf dem Handy nicht mehr (A1), (2) in Reihen aus Hüllen greifen Geschwister-Selektoren nicht mehr (A2, Liste unten); beide sind durch `check-tooltip-bedienung.ts` bzw. `check-empfehlung-aktionen.ts` und die Bilder unten belegt.
- **A6 (klein)** `hinweis-flaeche.tsx`: beide Zeitgeber (Schließen nach 3 s, Sperre nach Touch 1 s) räumt ein Effekt beim Abbau ab, der Sperr-Timer wird vor dem Neustellen gelöscht; Escape schließt Blasen für `Tooltip` und `useFlaechenHinweis` gemeinsam in `useEinzigeBlase` (`tooltip-einzeln.ts`, `keydown`-Hörer am Dokument, solange offen). Beleg: `check-tooltip-bedienung.ts` (Escape am Tooltip, Escape an der Fläche, nach dem Abbau 0 offene Zeitgeber; vorher rot).

## Selektor-Liste (A2): jede Stelle mit `>`, `:nth-child`, `:first-child`, `:last-child`, `+`, `~`, Elementselektor oder Kind-Variante an einer umhüllten Stelle

| Fundstelle | Befund |
|---|---|
| `empfehlung.css:48` `button:not(:nth-child(2))` | gebrochen (jeder Knopf einziges Kind der Hülle), behoben: `> .empf-huelle-schmal` |
| `empfehlung.css:49` `button:nth-child(2)` | gebrochen, behoben: `.empf-knopf-mitte` |
| `empfehlung.css:47` `.empf-aktionen button { flex: 1; … }` | heil (Nachfahrenselektor, trifft den Knopf in der Hülle); der Knopf füllt die Hülle |
| `empfehlung.css:61` `.empf-auf-bild` (ZumKalender) | heil (Klasse am Link selbst) |
| `empfehlung.css:21` `.empf-spalte:nth-child(even)` | heil (Mosaik-Spalten, keine Hülle) |
| `patchnotes.css:104-106` `.pn-zeile + .pn-zeile`, `> span:first-child` | heil (Patchnotes-Zeilen nutzen `data-hinweis`, keine Hülle) |
| `styles.css:597` `main:has([data-ladeplatz]) ~ footer` | heil (keine umhüllte Stelle) |
| `tippziele.css:18` `footer p a` | heil (Nachfahre, Fuß hat keine Hülle in diesem PR) |
| `buehne.tsx:55` `[&>*]:pointer-events-auto` | heil (Hülle ist jetzt das Kind und erbt `pointer-events` an das `<h2>`) |
| `FilterDetails.tsx:256` `[&>div]:gap-y-0` | heil (betrifft `Bereich`-Kinder, nicht den „Meine Anbieter“-Knopf) |
| `beleg-dialog.tsx:270` `space-y-1` | heil (`ul` mit `li`, Beleg-Knopf liegt nicht darin) |
| JS: `Schwebe.tsx:87`, `:207`, `patchnotes-teile.tsx:138` (`querySelector('button…')`) | heil (Nachfahrenselektoren) |
| JS: `woche-sprung.ts:54` `.ak-oeffnen`.parentElement | heil (Kalenderkarte, nicht umhüllt) |

Gesucht wurde in allen `*.css` unter `web/src` nach `>`, `:nth-child`, `:first-child`, `:last-child`, `+`, `~`, `:only-child`, `:first-of-type`, `:last-of-type`, in den umhüllten Dateien nach `[&>`, `first:`, `last:`, `odd:`, `even:`, `space-`, `divide-`, `peer`, `group-`, und in `web/src` nach `querySelector`, `children[`, `firstElementChild`, `nextElementSibling`, `:scope`.

## Bilder (Zweig `prtext/tooltips-eigen-statt-title-r1`, Ordner `bilder/`)

- `beleg-1024-dunkel-vor.png` / `beleg-1024-dunkel-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 1024 px, dunkel): gleich.
- `beleg-1024-hell-vor.png` / `beleg-1024-hell-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 1024 px, hell): abweichend nur im Hintergrund hinter dem Panel (Seitenliste dort anders gescrollt, Bild ist kein Pixelvergleich des Knopfs); der Knopf rechts im Bild ist gleich.
- `beleg-1440-dunkel-vor.png` / `beleg-1440-dunkel-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 1440 px, dunkel): gleich.
- `beleg-1440-hell-vor.png` / `beleg-1440-hell-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 1440 px, hell): gleich.
- `beleg-390-dunkel-vor.png` / `beleg-390-dunkel-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 390 px, dunkel): gleich.
- `beleg-390-hell-vor.png` / `beleg-390-hell-nach.png` (Beleg-Knopf „Quelle“ im Neuigkeiten-Kasten, ruhend, 390 px, hell): gleich.
- `beleg-hover-1024-dunkel-vor.png` / `beleg-hover-1024-dunkel-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 1024 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `beleg-hover-1024-hell-vor.png` / `beleg-hover-1024-hell-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 1024 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `beleg-hover-1440-dunkel-vor.png` / `beleg-hover-1440-dunkel-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 1440 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `beleg-hover-1440-hell-vor.png` / `beleg-hover-1440-hell-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 1440 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `beleg-hover-390-dunkel-vor.png` / `beleg-hover-390-dunkel-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 390 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `beleg-hover-390-hell-vor.png` / `beleg-hover-390-hell-nach.png` (Beleg-Knopf „Quelle“ unter dem Zeiger, 390 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-1024-dunkel-vor.png` / `kopf-1024-dunkel-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 1024 px, dunkel): gleich.
- `kopf-1024-hell-vor.png` / `kopf-1024-hell-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 1024 px, hell): gleich.
- `kopf-1440-dunkel-vor.png` / `kopf-1440-dunkel-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 1440 px, dunkel): gleich.
- `kopf-1440-hell-vor.png` / `kopf-1440-hell-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 1440 px, hell): gleich.
- `kopf-390-dunkel-vor.png` / `kopf-390-dunkel-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 390 px, dunkel): gleich (Suchfeld bleibt leer, Themenknopf unter 768 px ausgeblendet; der Löschknopf ist im Bild `kopf-loeschen-390` belegt).
- `kopf-390-hell-vor.png` / `kopf-390-hell-nach.png` (Kopf mit Themenknopf und Suchfeld (Text „Naruto“), ruhend, 390 px, hell): gleich (Suchfeld bleibt leer, Themenknopf unter 768 px ausgeblendet; der Löschknopf ist im Bild `kopf-loeschen-390` belegt).
- `kopf-loeschen-390-dunkel-vor.png` / `kopf-loeschen-390-dunkel-nach.png` (Löschknopf der Suche (Handy, Suche geöffnet, Text „Naruto“), 390 px, dunkel): gleich.
- `kopf-loeschen-390-hell-vor.png` / `kopf-loeschen-390-hell-nach.png` (Löschknopf der Suche (Handy, Suche geöffnet, Text „Naruto“), 390 px, hell): gleich.
- `kopf-loeschen-hover-1024-dunkel-vor.png` / `kopf-loeschen-hover-1024-dunkel-nach.png` (Löschknopf der Suche unter dem Zeiger, 1024 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-loeschen-hover-1024-hell-vor.png` / `kopf-loeschen-hover-1024-hell-nach.png` (Löschknopf der Suche unter dem Zeiger, 1024 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-loeschen-hover-1440-dunkel-vor.png` / `kopf-loeschen-hover-1440-dunkel-nach.png` (Löschknopf der Suche unter dem Zeiger, 1440 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-loeschen-hover-1440-hell-vor.png` / `kopf-loeschen-hover-1440-hell-nach.png` (Löschknopf der Suche unter dem Zeiger, 1440 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-thema-hover-1024-dunkel-vor.png` / `kopf-thema-hover-1024-dunkel-nach.png` (Themenknopf unter dem Zeiger, 1024 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-thema-hover-1024-hell-vor.png` / `kopf-thema-hover-1024-hell-nach.png` (Themenknopf unter dem Zeiger, 1024 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-thema-hover-1440-dunkel-vor.png` / `kopf-thema-hover-1440-dunkel-nach.png` (Themenknopf unter dem Zeiger, 1440 px, dunkel): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `kopf-thema-hover-1440-hell-vor.png` / `kopf-thema-hover-1440-hell-nach.png` (Themenknopf unter dem Zeiger, 1440 px, hell): abweichend, erwartet: Knopf unverändert, neu steht die eigene Blase darunter (vorher der native title, der in keinem Bild erscheint).
- `vorschlaege-1024-dunkel-vor.png` / `vorschlaege-1024-dunkel-nach.png` (Vorschläge, Knopfreihe unter den Covern, 1024 px, dunkel): abweichend: Reihe sitzt in der Spalte, vorher ragte der ✕-Knopf rechts über den Spaltenrand (main-Stand), „Schon gesehen“ ist jetzt der schmalere Mittelknopf (12 px, Abstand 4 px) wie im CSS vorgesehen; knapp, Schrift berührt den Rand fast.
- `vorschlaege-1024-hell-vor.png` / `vorschlaege-1024-hell-nach.png` (Vorschläge, Knopfreihe unter den Covern, 1024 px, hell): abweichend: Reihe sitzt in der Spalte, vorher ragte der ✕-Knopf rechts über den Spaltenrand (main-Stand), „Schon gesehen“ ist jetzt der schmalere Mittelknopf (12 px, Abstand 4 px) wie im CSS vorgesehen; knapp, Schrift berührt den Rand fast.
- `vorschlaege-1440-dunkel-vor.png` / `vorschlaege-1440-dunkel-nach.png` (Vorschläge, Knopfreihe unter den Covern, 1440 px, dunkel): optisch gleich (Rest unter 2 % der Pixel, minimale Farbabweichung, keine Lageänderung).
- `vorschlaege-1440-hell-vor.png` / `vorschlaege-1440-hell-nach.png` (Vorschläge, Knopfreihe unter den Covern, 1440 px, hell): optisch gleich (Rest unter 2 % der Pixel, minimale Farbabweichung, keine Lageänderung).
- `vorschlaege-390-dunkel-vor.png` / `vorschlaege-390-dunkel-nach.png` (Vorschläge, Knopfreihe unter den Covern, 390 px, dunkel): optisch gleich (Rest unter 2 % der Pixel, minimale Farbabweichung, keine Lageänderung).
- `vorschlaege-390-hell-vor.png` / `vorschlaege-390-hell-nach.png` (Vorschläge, Knopfreihe unter den Covern, 390 px, hell): optisch gleich (Rest unter 2 % der Pixel, minimale Farbabweichung, keine Lageänderung).
- `vorschlaege-hover-1024-dunkel-vor.png` / `vorschlaege-hover-1024-dunkel-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 1024 px, dunkel): abweichend: wie ruhend (Reihe in der Spalte) plus die eigene Blase am Favorit-Knopf.
- `vorschlaege-hover-1024-hell-vor.png` / `vorschlaege-hover-1024-hell-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 1024 px, hell): abweichend: wie ruhend (Reihe in der Spalte) plus die eigene Blase am Favorit-Knopf.
- `vorschlaege-hover-1440-dunkel-vor.png` / `vorschlaege-hover-1440-dunkel-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 1440 px, dunkel): abweichend, erwartet: eigene Blase am Favorit-Knopf, Reihe sonst gleich.
- `vorschlaege-hover-1440-hell-vor.png` / `vorschlaege-hover-1440-hell-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 1440 px, hell): abweichend, erwartet: eigene Blase am Favorit-Knopf, Reihe sonst gleich.
- `vorschlaege-hover-390-dunkel-vor.png` / `vorschlaege-hover-390-dunkel-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 390 px, dunkel): abweichend, erwartet: eigene Blase am Favorit-Knopf, Reihe sonst gleich.
- `vorschlaege-hover-390-hell-vor.png` / `vorschlaege-hover-390-hell-nach.png` (Vorschläge, erster Knopf (Favorit) unter dem Zeiger, 390 px, hell): abweichend, erwartet: eigene Blase am Favorit-Knopf, Reihe sonst gleich.

Die Hover-Bilder zeigen den Unterschied, der gewollt ist (eigene Blase statt der Betriebssystem-Blase, die kein Screenshot zeigt); alle ruhenden Zustände sind gleich bis auf die Vorschläge bei 1024 px (siehe oben).

## Rückblick

- gut: ein Test mit Mini-DOM bildet Touch-Tipp, Escape und Abbau ab, ohne Browser und ohne Uhr; `loese()` in `tools/mini-dom.ts` ist wiederverwendbar.
- schlecht: der Erstbau hatte die Knopfreihe nicht gegen die Hülle geprüft; Wächter (`check-empfehlung-aktionen.ts`) hing am alten Selektor und blieb deshalb grün.
- unerwartet: auf main ragte der ✕-Knopf bei 1024×768 schon über den Spaltenrand; die neue Struktur behebt das nebenbei, die Schrift sitzt dort knapp.
- Vorschlag: eine Prüfung „Hülle bricht Geschwister-Selektor“ (CSS-Regeln mit `:nth-child` gegen die Komponenten, die sie treffen) als Wächter.
- veraltet: der Satz „Leerraum: absichtlich“ im PR-Text (ersetzt, A5).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
