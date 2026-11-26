## fix(prime): Pille nimmt Direktlink desselben Kanals, Suchlinks werden Suchaufträge, gemeldete Seite stößt den Bau an

Daniel, 26.11. 21:03 (kritisch): Detail-Panel The Most Heretical Last Boss Queen (156040) — die Abo-Kachel „Prime Video (Aniverse) seit 26.11.2026“ führte in die Amazon-Suche, „Amazon Prime (Aniverse)“ darunter direkt auf `amazon.de/gp/video/detail/B0FBGJLZ4Y`.

### (a) Ursache
- `adresseDesWegs` (`pipeline/bau/13-1-termin-adressen.ts`) las nur `streams`. Der Kanal-Titel hat dort keinen Prime-Verweis; die Seite steht nur im Bezugsweg `watchLinks`. Der Termin `auto-156040-primevideo` blieb ohne `platformUrl`.
- `pillenZiel` (`web/src/components/detail/pillen-ziel.ts`) baut dann die Suche erst im Browser (`primeSuchAdresse`). Der Bau kennt diese Suchlinks nicht: `prime-suche.json` entsteht nur aus `streams`-Suchen, TMDB-Vorschlägen und `kanal-widerspruch.json` (`tools/extension-offene-amazon.mjs`), die Termin-Pille taucht nirgends auf.
- Die Doppelung (Pille + „Weitere Anbieter“) bleibt als Anzeige bestehen: beide führen jetzt auf dieselbe Seite. Eine Zusammenlegung in der Oberfläche habe ich nicht gebaut (Umbau der Wege-Gruppen im Panel, eigener PR; Vorschlag unten).

### (b) Klasse (Bestand 26.11.2026, `public/data/releases.json`)
| | Zahl |
|---|---|
| Prime-Termine | 116 |
| ohne Adresse (Pille sucht) | 25, dazu 1 Such-`platformUrl` (Yu-Gi-Oh! 481) |
| davon Direktlink desselben Kanals in `watchLinks` | 3 (156040, 175914, 11499) |
| auf der Suchauftragsliste (`prime-suche.json`) vorher | 0 (Liste: Kitaro, Black Butler) |
| weder noch | 22 + 1 |

Nach dem Fix (Kulisse, Kopie von `data/`, Bau-Funktionen auf dem echten Bestand): 3 Direktlinks, 23 Suchaufträge im Bau, davon 5 neu auf der Liste der Erweiterung (60, 180829, 196144, 204389, 5000002); 18 Aniverse-Titel tragen einen Prime-Handbeleg ohne Kanalangabe und legt die Erweiterung nicht erneut vor — offene Klasse, Ratsche `UNGEKLAERT_HOECHSTENS = 18`.
Nicht angefasst (kein Prime, keine Erweiterungsliste dafür): Disc-Händlerlinks Amazon-Namenssuche 238 (200 `platformUrl`, 38 `buyUrl`, davon 3 mit Direkt-Kaufweg), EAN-Suche 186 (gewollt), RTL+ 1 (Dragon Ball DAIMA), Netflix 1 (LEGO One Piece).

### (c) dauerhaft
- `primeVerweisDesKanals`: Fallback auf „Amazon Prime (<Kanal>)“ aus `watchLinks` (genau ein Treffer, Titelseite, Kanal gesetzt). Das „seit“-Datum kommt weiter aus dem Termin.
- `offeneTerminSuchen` (`pipeline/bau/13-3-termin-suchen.ts`): jede verbleibende Prime-Pille wird je Titel ein Suchauftrag in `data/suchadressen-offen.json` (→ `prime-suche.json`), auch wenn der Titel eine Prime-Seite eines anderen Kanals trägt.

### (d) Wächter
- Fixture `pipeline/check-prime-suchlink-direkt.ts` (check:logic): Fall der Meldung, anderer Kanal, fehlender Kanal, zwei Treffer, Such-Verweis, Disc/Titelseite, Handbeleg. Mutationsprobe: 4 Mutanten (Fallback aus, Kanalvergleich aus, Listenprüfung aus, Titelseitenprüfung aus) alle rot; M4 überlebte zuerst, dafür kam der Such-Verweis-Fall dazu.
- Bestand `pipeline/check-prime-suchlink-bestand.ts` (check:bestand-liste): rot bei Direktlink nicht übernommen oder Pille ohne Eintrag in `prime-suche.json`; bis zum nächsten Bestandsbau gegen die alten Daten rot (3 Direktlinks), danach grün.
- Worker: `tools/worker-bau-anstoss.test.ts` (check:worker), 7 Mutanten alle rot.

### (e) „Sofort live nach Meldung“
Gemessen an Läufen vom 26.11.2026: Bestandsbau startet erst nach dem Sammel-Lauf (Starts 17:07, 18:08, 19:09 UTC, Wartezeit bis 60 min), läuft 9,5 / 13,5 / 23 min, Deploy 10,9 / 11,9 min → Meldung bis live bis 80–95 min.
Neu: `worker/src/bau-anstoss.ts` startet nach einer angenommenen Prime-Meldung mit `suchUrl` (Einzel und Stapel) `bestand-bauen.yml` per `workflow_dispatch`, mit dem vorhandenen `GITHUB_WECKER_TOKEN` (Actions Read and write, kein neues Secret). Entprellung: wartender Bau vorhanden → kein Start; laufender Bau zählt nicht. Website liest keine D1. **Erwartet: 21–35 min** (Bau 10–23 + Deploy 11–12), nicht gemessen am echten Fall.
**Deploy-Schritt vor Wirkung (kann nur Daniel/Inhaber):** `cd worker && npx wrangler deploy --config wrangler.toml` aus sauberem `origin/main` nach dem Merge. Bis dahin gilt der alte Weg.

### Warum Tests und Prüfer es durchließen
Der Fehler lag zwischen Bau und Oberfläche: der Bau-Test (`check-prime-pille.ts`) deckte nur Wege in `streams`, die Pille testete nur ihren Fallback (Suche statt Nichts, 11.10.2026), und kein Wächter fragte „führt ein ausgelieferter Link in eine Suche, obwohl ein Direktlink oder ein Auftrag vorliegt?“. Geschärft: `bauer.md` und `pruefer.md` K58 (Quellen einer Adresse zählen, Klassenzahl am Bestand, Wächter mit Kern `suchlinksOhneAusweg`).

### Geprüft
`check-prime-suchlink-direkt`, `check-prime-pille`, `check-weg-adresse-bezugsweg`, `check-prime-gleiche-gti`, `check-wege-aus-terminen`, `check-suchadressen-endzustand`, `worker-wecker`, `worker-stapel`, `worker-prime-ohne-version`, `worker-meldung-seitenadresse`, `worker-bau-anstoss`; `tsc --noEmit -p .`, `-p worker/tsconfig.json`, `-p tools/tsconfig.worker.json`; `check:umfang`, `bestand-marken`, `bestand-verstoss-zeile`, `check-workflows`, `uhr-in-tests`, `check-sammler-lesezugriffe`, `anleitungs-pfade-test`. Nicht lokal: `check:vor-commit` (Kette), `data:build` (kein Cache; Bau-Wirkung an Kulisse nachgerechnet).

**Nach dem Merge:** Bestandsbau abwarten, dann live messen: Last Boss Queen, Pille → `B0FBGJLZ4Y`; `prime-suche.json` enthält die 5 neuen Titel; Auftrag Worker-Deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77znGqevkDxVuRvZYPGg
