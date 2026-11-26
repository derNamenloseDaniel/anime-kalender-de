<!-- titel: feat(detail): Merken und Teilen als Icon-Knöpfe -->

## Ansatz

Aktionsleiste unter dem Cover: „Merken/Gemerkt“ und „Teilen“ verlieren die Beschriftung und sind wie das Auge runde 44 × 44-Knöpfe (`KNOPF_ZEICHEN`). Der Name steht in `aria-label` und im projekteigenen `Tooltip` (kein `title`), mit dem bisherigen Text (Merken/Gemerkt, Teilen/Kopiert). Der Gold-Zustand bleibt über `.ak-merken-an` (Goldverlauf, Goldrand, gefüllter Stern) und `aria-pressed`. Trailer-Knopf unverändert. Die Leiste wird nur in `buehne.tsx` über `PanelAktionen` gerendert (Suche: keine weitere Stelle).

## Geänderte Dateien

- `web/src/components/detail/aktionen.tsx`: Knöpfe als Zeichen-Knöpfe in `Tooltip`, Textkonstanten `merkenText`/`teilenText`, ungenutzte Klasse `KNOPF` entfernt.
- `data/patchnotes/merken-und-teilen-als-symbol.yaml`: Patchnote (feature).

## Prüfung

`tsc --noEmit -p .`, `check:umfang`, `design-klassen.mjs` grün (Farbklassen gesunken). Kein Test referenziert die Beschriftungen. Screenshots (Panel, 512 px breit ≈ Handy, hell/dunkel; `tools/panel-bild.mjs`): `nachher-hell-512.png`, `nachher-dunkel-512.png`. Kein Vorher-Bild und kein Desktop-Bild: das Werkzeug fährt nur eine Breite, der Vorher-Stand lag nicht gebaut vor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
