# Bericht: Fool Night als Katalog-Release

- Ursache: Meldung ohne Folgenzahl → Batch ohne `episodeCount` → `istBatchAmStueck` (`shared/katalog-release.ts`) lehnt ab.
- Fix: `pipeline/lib/komplettstart-zahl.ts` (neu, 16 Zeilen), 2 Zeilen in `zeitplanAusVorschlag`; Netflix + ONA + AniList-Ende = Starttag → AniList-Zahl, Marke bleibt „abgeleitet“.
- Klasse: 1 Fall (Fool Night); alle anderen Batch ohne Zahl sind alte Serien (Katalogzugang).
- Wächter: `komplettstart()` in `check-katalog-release.ts` (1 Hauptfall, 4 Gegenproben), 2 Mutanten gefangen.
- Schnellweg am echten Titel: vorher keine Marke, nachher `abgeleitet`, 12 Folgen. tsc, umfang, eslint, Mutationsanker grün.
- Nicht ausgeführt: voller `check:vor-commit` (Kette macht das), Live-Messung (erst nach Bau und Deploy).

Rückblick
- gut: Schnellweg direkt mit der Funktion auf dem echten Titel zeigte Ursache in Sekunden.
- schlecht: Netzwerk sperrte streamwert.de, Beleg nur über Suchtreffer, Seitenzitat fehlt.
- unerwartet: Das Release trägt `sprache: "offen"`, obwohl der Titel `dub: true` führt und Netflix nun mit Synchro gestartet ist.
- Vorschlag: Bestandswächter „Netflix-ONA mit Ende = Start ohne Katalogmarke“, falls ein zweiter Fall auftaucht; Hinweis „Synchro offen“ nach Erscheinen prüfen.
- veraltet: Kommentar am `zeitplanAusVorschlag`-Doc („Fool Night kommt am 26.11.2026 komplett“) beschrieb schon die Komplett-Erkennung, nicht die Zahl; sonst nichts.
