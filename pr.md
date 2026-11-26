<!-- titel: Studio von Hand: 8 weitere Titel ohne AniList-Studio -->
Auftrag: maengel-studio

Trägt für 8 der 34 offenen Studio-Mängel (`hand:studio-von-hand`) das Animationsstudio in `data/studio-von-hand.yaml` ein. Je Eintrag zwei https-Quellen, Abruf 26.11.2026 (Websuche).

Offene Mängel Art studio: vorher 34, nachher 26 (erwartet nach dem nächsten Bestandsbau; Messung mit dem Mängel-Werkzeug).

Eingetragen: Spycies (Lux Populi), Have a Nice Day (Le-joy Animation Studio), Leafie (Odoltogi), Pororo – Racing Adventure (Ocon), Dragon Nest und Throne of Elves (Mili Pictures), Red Shoes (Locus Corporation), Kuma-Special Kumadam-hen (EMT Squared).

Annahmen:
- Nur `data/studio-von-hand.yaml` berührt (Auftragsgrenze „keine andere Datei unter data/“); deshalb kein Patch-Notes-Eintrag.
- Kein Code geändert: kein neuer Test, keine Mutationstabelle (Diff-Mutanten: keine Code-Zeilen im Diff). Berührter Studio-Test Exit 0, `npx tsc --noEmit -p .` Exit 0.
- Schreibweise der Studios nach Quelle; weicht AniList ab, ersetzt der Handweg nie ein vorhandenes Studio.

Der Rest steht im Bericht auf dem Zweig `prtext/maengel-studio`.
