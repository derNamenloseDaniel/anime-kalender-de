# Nachtrag PR 5252: Abgleich aller „am selben Tag“-Paare

Stand: Zweig `fix/disc-bereich-sichtbar` (Kopf 63df57d84c), Datenstand `public/data` vom 27.11.2026. Keine Codeänderung, daher keine neuen Tests.

**Verfahren:** Scratch-Skript (nicht im Repo) ruft die echte `discAusgabenVon` je Titel mit Disc-Terminen auf (188 Titel, 780 Ausgaben) und sammelt jede Ausgabe, deren Termin nicht über einen Artikel-Link (`perArtikel`), sondern über `amSelbenTag` zugeordnet wurde. Ergebnis: **123 Paare**, deckt sich mit der Beschreibung (183 → 60). Kein einziger dieser 123 Termine nennt selbst einen aniSearch-Artikel (alle 123 ohne Artikel-Link in `sources`), `amSelbenTag` ist also der einzige Weg.

**Abweichungen (je Paar bewertet, Liste unten):**

| Klasse | Paare | Bewertung |
|---|---|---|
| alle übrigen (Klassen überschneiden sich, Zeilen unten einzeln gelesen) | Rest | Band, Datum, Format, Edition gleich oder ohne Widerspruch: gleiche Ausgabe |
| Edition: aniSearch „Limited/Steelbook/Mediabook/Steelcase“, Termin schweigt („Complete Box“, „Blu-ray“, leer) | 17 (146234, 156415, 169417, 154412, 178090, 154965 Vol. 2+3, 130003 Vol. 2+3, 145728 Vol. 3+4, 196840, 132405, 112609, 127050, 166477, 178869) | **kein belegter Fehlgriff, nicht widerlegbar.** Schweigen ist kein Widerspruch; bei Clevatess (178869) und My Dress-Up Darling (132405) nennt die Quelle des Termins selbst „limited-edition“ bzw. „steelbook-edition“ im Link. Gäbe es Standard- und Limited-Artikel am selben Tag, stünde `artikel.length === 2` und es würde nicht zusammengeführt. Restrisiko: nur der Limited-Artikel steht auf aniSearch, der Termin meint die Standardausgabe. Netzsuche zu EAN (Bocchi Vol. 2, My One-Hit Kill Sister, Love of Kill) ohne Befund. |
| Termin „Limited“, aniSearch schlicht (176301 Apothekerin Vol. 1) | 1 | gleiche Ausgabe wahrscheinlich: Band und Tag gleich, jeder Band hat genau einen Artikel |
| „Bundle/Komplett-Bundle“ ↔ „Komplettset/Set: Box“ (97940, 103871, 120209, 5958, 857, 1482, 189, 853, 355) | 9 | gleiche Ausgabe (gleiche Bezeichnung der Gesamtbox) |
| „Ultimate Edition“ ↔ „Ultimate Edition, Limited Edition, 4K“ | 4 | gleiche Ausgabe (Ultimate = Limited) |
| Dragon Ball Z Filmbox Vol. 1/2 (894–901) | 8 | richtig: acht Titel (je ein Film), eine Box „Movie 01-04“ bzw. „05-08“ trägt jeden |
| Formatmenge verschieden (aniSearch „bd“, Termin „Blu-ray“ o. ä.) | 19 | Regel verlangt nur ein gemeinsames Format; alle 19 teilen mindestens eins; kein Gegenteil (nie 4K gegen DVD) |
| Band (Vol./Box/Film) | 0 Widersprüche | `gleicherBand` greift; „Teil N“ erkennt `band()` nicht (Tougen Anki Teil 1/2, Dr. STONE Teil 1/2 zeigen je auf den richtigen Tag) |

**Ergebnis: 0 echte Fehlgriffe gefunden, 17 Paare mit nicht belegbarer Edition.** Die Regel bleibt unverändert. Empfehlung (Entscheidung beim Dirigenten): will man das Restrisiko der 17 ausschließen, wäre „Limited-Merkmal muss auf beiden Seiten stehen“ die Bedingung; sie trennte 17 Paare wieder in zwei Zeilen (Rückfall auf die Doppelzeile ohne Kaufweg). Ohne Beleg eines tatsächlichen Fehlgriffs nicht umgesetzt.

**Rückblick:** *gut:* Zahl 123 reproduziert, Paarliste vollständig lesbar. *schlecht:* Edition lässt sich ohne Zugriff auf aniSearch und Händlerseiten nicht belegen. *unerwartet:* Bocchi Vol. 1 hat drei aniSearch-Artikel (inkl. Platinum VIP) und wird deshalb nicht zusammengeführt; die Eindeutigkeitsbedingung fängt genau diesen Fall. *Vorschlag:* „Teil N“ in `band()` aufnehmen (eigener Verhaltens-PR, kein Fall betroffen).

## Alle 123 Paare (Titel-ID | Datum Format | aniSearch-Ausgabe || Termin / Edition)

```
158559 | 2026-11-20 bd | AS: Vol. 4/4: Limited Mediabook Edition || R: 2.5 Dimensional Seduction – Vol. 4 / Limited Edition, DVD & Blu-ray
110277 | 2026-08-07 b | AS: Gesamtausgabe: Steelbook || R: Attack on Titan – Finale Staffel / Limited Steelbook Edition, Blu-ray
97940 | 2026-08-07 bd | AS: Set: Box 11-15 || R: Black Clover – Staffel 3 / Bundle Edition, DVD & Blu-ray
176311 | 2026-08-07 bd | AS: Vol. 2/2 || R: Blue Exorcist: Beyond the Snow Saga – Vol. 2 / DVD & Blu-ray
156067 | 2026-08-07 b | AS: Gesamtausgabe - || R: Campfire Cooking in Another World – Staffel 1 / Complete Box, Blu-ray
156415 | 2026-09-04 b | AS: Gesamtausgabe: Limited Edition || R: I Was Reincarnated as the 7th Prince – Staffel 1 / Complete Box, Blu-ray
168139 | 2026-08-07 b | AS: Gesamtausgabe || R: I'll Become a Villainess Who Goes Down in History / Complete Box, Blu-ray
116242 | 2026-09-04 b | AS: Gesamtausgabe || R: I'm Standing on a Million Lives – Staffel 1 / Complete Box, Blu-ray
146234 | 2026-09-04 b | AS: Gesamtausgabe: Limited Edition || R: My One-Hit Kill Sister – Staffel 1 / Complete Box, Blu-ray
169417 | 2026-09-04 b | AS: Staffel 1 - Gesamtausgabe: Limited Edition || R: Re:Monster – Staffel 1 / Complete Box, Blu-ray
6381 | 2026-11-27 bd | AS: Vol. 1/3: Limited Mediabook Edition + Sammelschuber || R: Strike Witches (Staffel 2) – Vol. 1 / Limited Edition mit Sammelschuber, DVD & Blu-ray
154412 | 2027-02-05 b | AS: Gesamtausgabe: Limited Edition || R: The Café Terrace and Its Goddesses – Staffel 1 / Complete Box, Blu-ray
129193 | 2027-01-29 b | AS: Vol. 3/3: Limited Mediabook Edition || R: Virgin Road – Vol. 3 / Limited Edition, Blu-ray
178680 | 2026-08-07 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: Wind Breaker (Staffel 2) – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
178680 | 2026-10-02 b | AS: Vol. 2/2 || R: Wind Breaker – Staffel 2 – Vol. 2 / Blu-ray
118465 | 2026-08-07 bd | AS: Vol. 2/3: Limited Steelcase Edition || R: World's End Harem – Vol. 2 / FSK-18-Edition im Steelcase, DVD & Blu-ray
2543 | 2026-08-20 b | AS: Gesamtausgabe + Filme || R: Robin Hood / Complete Box (Serie + Film), Blu-ray
156040 | 2026-09-03 b | AS: Gesamtausgabe || R: The Most Heretical Last Boss Queen – Staffel 1 / Complete Box, Blu-ray
180367 | 2026-08-20 b | AS: Vol. 1/2: Collector’s Edition || R: Witch Watch – Vol. 1 / Limited Collector's Edition, Blu-ray
164702 | 2026-08-21 b | AS: Vol. 1/2 || R: As a Reincarnated Aristocrat (Staffel 1) – Vol. 1 / Blu-ray
164702 | 2026-09-18 b | AS: Vol. 2/2 || R: As a Reincarnated Aristocrat – Vol. 2 / Blu-ray
179965 | 2026-12-18 b | AS: Vol. 1/3: Limited Edition + Sammelschuber || R: Bitte zieh dich an, Takamine! – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
179965 | 2027-01-15 b | AS: Vol. 2/3: Limited Edition || R: Bitte zieh dich an, Takamine! – Vol. 2 / Limited Edition, DVD & Blu-ray
101922 | 2026-08-21 b | AS: Gesamtausgabe: Limited Steelbook Edition || R: Demon Slayer – Staffel 1 / Limited Steelbook Edition, Blu-ray
154965 | 2026-11-20 bd | AS: Vol. 1/3: Limited Mediabook Edition + Sammelschuber || R: My Love Story with Yamada-kun at Lv999 – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
154965 | 2026-12-18 bd | AS: Vol. 2/3: Limited Mediabook Edition || R: My Love Story with Yamada-kun at Lv999 – Vol. 2 / DVD & Blu-ray
154965 | 2027-02-05 bd | AS: Vol. 3/3: Limited Mediabook Edition || R: My Love Story with Yamada-kun at Lv999 – Vol. 3 / DVD & Blu-ray
177474 | 2026-08-21 b | AS: Limited Collector’s Edition || R: Tougen Anki – Teil 1 / Limited Collector's Edition, Blu-ray
177474 | 2026-11-06 b | AS: Limited Collector’s Edition || R: Tougen Anki – Teil 2 / Limited Collector's Edition, Blu-ray
4752 | 2026-08-21 b | AS: Gesamtausgabe || R: Vampire Knight Guilty / Complete Box, Blu-ray
185660 | 2026-08-28 bd | AS: Vol. 3/3: Limited Edition || R: DAN DA DAN (Staffel 2) – Vol. 3 / Limited Edition, DVD & Blu-ray
99726 | 2026-08-28 b | AS: Vol. 2/2: Limited Edition || R: Recovery of an MMO Junkie – Vol. 2 / Limited Edition, Blu-ray
127366 | 2027-02-05 b | AS: Gesamtausgabe || R: I'm Standing on a Million Lives – Staffel 2 / Complete Box, Blu-ray
10009632 | 2026-07-31 b | AS: Gesamtausgabe || R: Manga Love Story: The One And Only Step Up Love Story / Gesamtausgabe, Blu-ray
185262 | 2027-02-25 b | AS: Staffel 1 - Gesamtausgabe || R: Hell Mode – Staffel 1 – Komplettbox / Komplettbox, Blu-ray
185880 | 2026-09-04 bd | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: Blue Exorcist: The Blue Night Saga – Vol. 1 / Limited Edition mit Sammelschuber, DVD & Blu-ray
185880 | 2026-10-02 bd | AS: Vol. 2/2 || R: Blue Exorcist: The Blue Night Saga – Vol. 2 / DVD & Blu-ray
235 | 2026-09-04 b | AS: Box 09 || R: Detektiv Conan – Box 9 / Box 9, Blu-ray
235 | 2026-12-18 bd | AS: Box 01: 30th Anniversary Edition || R: Detektiv Conan – Box 1 (30th Anniversary Edition) / 30th Anniversary Edition, DVD & Blu-ray
114862 | 2026-09-04 b | AS: Gesamtausgabe || R: Log Horizon – Staffel 3 / Komplettbox, Blu-ray
185736 | 2026-09-04 b | AS: Staffel 1 - Gesamtausgabe || R: My Hero Academia: Vigilantes – Staffel 1 / Komplettbox, Blu-ray
163134 | 2026-09-04 b | AS: Starting Life in Another World: Staffel 3 - Vol. 1/3: Limited Edition + Sammelschuber || R: Re:ZERO – Staffel 3 – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
163134 | 2026-11-06 b | AS: Starting Life in Another World: Staffel 3 - Vol. 2/3 || R: Re:ZERO – Staffel 3 – Vol. 2 / Blu-ray
163134 | 2027-01-15 b | AS: Starting Life in Another World: Staffel 3 - Vol. 3/3 || R: Re:ZERO – Staffel 3 – Vol. 3 / Blu-ray
530 | 2026-10-16 bd | AS: Gesamtausgabe: Limited Steelbook Edition || R: Sailor Moon – Staffel 1 / Limited Steelbook Edition, DVD & Blu-ray
161645 | 2026-09-04 b | AS: Gesamtausgabe: Steelbook || R: Die Tagebücher der Apothekerin – Staffel 1 / Limited Steelbook Edition, Blu-ray
130003 | 2027-01-15 bd | AS: Vol. 2/3: Limited Steelcase Edition || R: Bocchi the Rock! – Vol. 2 / Blu-ray
130003 | 2027-02-05 bd | AS: Vol. 3/3: Limited Steelcase Edition || R: Bocchi the Rock! – Vol. 3 / DVD & Blu-ray
481 | 2026-09-17 b | AS: Gesamtausgabe || R: Yu-Gi-Oh! – Komplettbox / Komplettbox, Blu-ray
179998 | 2026-09-18 b | AS: Steelbook || R: Kaiju No. 8: Mission Recon – Der Film / Limited Steelbook Edition, Blu-ray
172355 | 2026-09-18 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: Master Detective Ron Kamonohashi – Staffel 2 – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
172355 | 2026-11-20 b | AS: Vol. 2/2 || R: Master Detective Ron Kamonohashi – Staffel 2 – Vol. 2 / Blu-ray
163139 | 2026-09-18 bd | AS: Vol. 3/3 || R: My Hero Academia – Staffel 7 – Vol. 3 / DVD & Blu-ray
127230 | 2026-10-02 bd | AS: Komplettset: Limited Edition || R: Chainsaw Man – Staffel 1 / Bundle Edition, DVD & Blu-ray
139630 | 2026-10-02 bd | AS: Gesamtausgabe || R: My Hero Academia – Staffel 6 / Komplettbox, DVD & Blu-ray
103871 | 2026-10-02 bd | AS: Komplettset || R: Zombie Land Saga – Staffel 1 + 2 / Bundle Edition, DVD & Blu-ray
172019 | 2026-10-16 b | AS: Staffel 4 - Box 1/3: Limited Edition + Sammelschuber || R: Dr. STONE: Science Future – Teil 1 / Limited Edition mit Sammelschuber, Blu-ray
181839 | 2026-10-16 b | AS: Miss Kobayashi’s Dragon Maid: Ein einsamer Drache sehnt sich nach Liebe || R: Miss Kobayashi's Dragon Maid: Ein einsamer Drache sehnt sich nach Liebe / Blu-ray
120209 | 2026-10-16 bd | AS: Komplettset || R: My Next Life as a Villainess – Staffel 2 / Bundle Edition, DVD & Blu-ray
179344 | 2026-10-16 b | AS: Gesamtausgabe || R: Rent-A-Girlfriend – Staffel 4 / Komplettbox, Blu-ray
131264 | 2026-10-16 bd | AS: Gesamtausgabe || R: Yashahime: Princess Half-Demon – Staffel 2 / Komplettbox, DVD & Blu-ray
145728 | 2026-11-20 b | AS: Staffel 1 - Vol. 1/4: Limited Edition + Sammelschuber || R: Spice and Wolf: Merchant Meets the Wise Wolf – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
145728 | 2026-12-18 b | AS: Staffel 1 - Vol. 2/4: Limited Edition || R: Spice and Wolf: Merchant Meets the Wise Wolf – Vol. 2 / Limited Edition, Blu-ray
145728 | 2027-01-15 b | AS: Staffel 1 - Vol. 3/4: Limited Edition || R: Spice and Wolf: Merchant Meets the Wise Wolf – Vol. 3 / Blu-ray
145728 | 2027-02-19 b | AS: Staffel 1 - Vol. 4/4: Limited Edition || R: Spice and Wolf: Merchant Meets the Wise Wolf – Vol. 4 / Blu-ray
187892 | 2026-10-22 b | AS: Collector’s Edition || R: All You Need is Kill / Collector's Edition, Blu-ray — deutscher und japanischer Ton, Artcards, Trailer
173694 | 2026-11-06 b | AS: Gesamtausgabe || R: Failure Frame – Komplettbox / Komplettbox, Blu-ray
185212 | 2026-11-20 bd | AS: Film 28: Der Flashback des Einäugigen - Limited Edition || R: Detektiv Conan – 28. Film: Der Flashback des Einäugigen / Limited Edition, DVD & Blu-ray
21776 | 2026-12-04 b | AS: Gesamtausgabe: Steelbook || R: Miss Kobayashi’s Dragon Maid – Staffel 1 / Limited Steelbook Edition, Blu-ray
172258 | 2026-12-04 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: The 100 Girlfriends – Staffel 2, Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
178090 | 2027-02-05 b | AS: Gesamtausgabe: Limited Edition || R: I Was Reincarnated as the 7th Prince – Staffel 2 / Komplettbox, Blu-ray
5681 | 2026-10-22 u | AS: Ultimate Edition [4K UHD+Blu-ray] + OST || R: Summer Wars – Ultimate Edition / Ultimate Edition, Limited Edition, 4K-Blu-ray & Blu-ray
12355 | 2026-10-22 u | AS: Ultimate Edition || R: Ame & Yuki – Die Wolfskinder – Ultimate Edition / Ultimate Edition, Limited Edition, 4K-Blu-ray & Blu-ray
2236 | 2026-10-22 u | AS: Ultimate Edition [4K UHD+Blu-ray] + OST || R: Das Mädchen, das durch die Zeit sprang – Ultimate Edition / Ultimate Edition, Limited Edition, 4K-Blu-ray & Blu-ray
20981 | 2026-10-22 u | AS: Ultimate Edition [4K UHD+Blu-ray] + OST || R: Der Junge und das Biest – Ultimate Edition / Ultimate Edition, Limited Edition, 4K-Blu-ray & Blu-ray
196840 | 2026-10-30 b | AS: Limited Edition || R: I Want You To Show Me Your Panties With a Disgusted Face Returns / Blu-ray
192809 | 2027-01-15 b | AS: The Movie || R: Jujutsu Kaisen: Hidden Inventory / Premature Death – The Movie / Blu-ray
189117 | 2027-01-15 b | AS: Staffel 4 - Box 2/3 || R: Dr. STONE: Science Future – Teil 2 / Komplettbox, Blu-ray
173780 | 2026-11-20 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: The Rising of the Shield Hero – Staffel 4 – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
173780 | 2027-01-15 b | AS: Vol. 2/2 || R: The Rising of the Shield Hero – Staffel 4 – Vol. 2 / Blu-ray
176301 | 2026-12-04 bd | AS: Vol. 1/4 || R: Die Tagebücher der Apothekerin – Staffel 2 – Vol. 1 / Limited Edition mit Sammelschuber, DVD und Blu-ray
176301 | 2027-01-15 bd | AS: Vol. 2/4 || R: Die Tagebücher der Apothekerin – Staffel 2 – Vol. 2 / DVD & Blu-ray
153288 | 2026-12-04 b | AS: Steelbook || R: Kaiju No. 8 / Steelbook-Komplettbox, Blu-ray
177132 | 2026-12-11 b | AS: A New Dawn || R: A New Dawn / Blu-ray
137667 | 2026-11-06 b | AS: Gesamtausgabe || R: Lord of Mysteries – Staffel 1 – Komplettbox / Komplettbox, Blu-ray
5958 | 2026-11-20 bd | AS: Staffel 1+2 - Komplettset || R: Angeloid – Sora no Otoshimono – Staffel 1 & 2 – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
178434 | 2026-11-20 b | AS: Vol. 1/2 || R: As a Reincarnated Aristocrat – Staffel 2 – Vol. 1 / Blu-ray
178434 | 2027-01-15 b | AS: Vol. 2/2 || R: As a Reincarnated Aristocrat – Staffel 2 – Vol. 2 / Blu-ray
857 | 2026-11-20 bd | AS: Komplettset || R: Air Gear – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
1482 | 2026-11-20 bd | AS: Set: Box 1-3 || R: D.Gray-man – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
189 | 2026-11-20 bd | AS: Komplettset || R: Love Hina – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
853 | 2026-11-20 b | AS: Komplettset || R: Ouran High School Host Club – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
355 | 2026-11-20 d | AS: Komplettset: Limited Steelbook Edition + Sammelschuber || R: Shakugan no Shana – Staffel 1 und 2 – Komplett-Bundle / Komplett-Bundle, DVD und Blu-ray
1548 | 2026-12-10 b | AS: Gesamtausgabe || R: Die Königin der tausend Jahre – Komplettbox / Komplettbox, Digital Remastered, Blu-ray
173693 | 2026-12-04 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: Loner Life in Another World – Vol. 1 / Limited Edition mit Sammelschuber, Blu-ray
173693 | 2027-01-29 b | AS: Vol. 2/2: Limited Edition || R: Loner Life in Another World – Vol. 2 / Limited Edition, Blu-ray
894 | 2026-11-20 b | AS: Movie 01-04 || R: Dragon Ball Z: Die Todeszone des Garlic Jr. / Filmbox Movies – Vol. 1 (Filme 1 bis 4), Blu-ray und DVD
895 | 2026-11-20 b | AS: Movie 01-04 || R: Dragon Ball Z: Der Stärkste auf Erden / Filmbox Movies – Vol. 1 (Filme 1 bis 4), Blu-ray und DVD
896 | 2026-11-20 b | AS: Movie 01-04 || R: Dragon Ball Z: Die Entscheidungsschlacht / Filmbox Movies – Vol. 1 (Filme 1 bis 4), Blu-ray und DVD
897 | 2026-11-20 b | AS: Movie 01-04 || R: Dragon Ball Z: Super-Saiyajin Son-Goku / Filmbox Movies – Vol. 1 (Filme 1 bis 4), Blu-ray und DVD
898 | 2027-01-15 b | AS: Movie 05-08 (Re-Release) || R: Dragon Ball Z: Rache für Freezer / Filmbox Movies – Vol. 2 (Filme 5 bis 8), Blu-ray und DVD
899 | 2027-01-15 b | AS: Movie 05-08 (Re-Release) || R: Dragon Ball Z: Coolers Rückkehr / Filmbox Movies – Vol. 2 (Filme 5 bis 8), Blu-ray und DVD
900 | 2027-01-15 b | AS: Movie 05-08 (Re-Release) || R: Dragon Ball Z: Angriff der Cyborgs / Filmbox Movies – Vol. 2 (Filme 5 bis 8), Blu-ray und DVD
901 | 2027-01-15 b | AS: Movie 05-08 (Re-Release) || R: Dragon Ball Z: Der Legendäre Super-Saiyajin / Filmbox Movies – Vol. 2 (Filme 5 bis 8), Blu-ray und DVD
1132 | 2027-02-25 b | AS: Gesamtausgabe (Re-Release) || R: Digimon Frontier / 
184591 | 2026-11-19 b | AS: Gesamtausgabe + OST || R: There’s No Freaking Way I’ll Be Your Lover! Unless… / 
237 | 2027-01-28 b | AS: Gesamtausgabe || R: Eureka Seven / 
180523 | 2026-11-06 b | AS: Gesamtausgabe - || R: A Wild Last Boss Appeared! / 
1313 | 2026-12-10 b | AS: Gesamtausgabe || R: Digimon 02 / 
132405 | 2026-12-04 b | AS: Gesamtausgabe: Steelbook || R: My Dress-Up Darling / 
1550 | 2026-11-19 b | AS: Gesamtausgabe || R: Mila Superstar / 
170577 | 2027-02-19 b | AS: Gesamtausgabe || R: Campfire Cooking in Another World with My Absurd Skill: Staffel 2 / 
156092 | 2027-02-19 b | AS: Gesamtausgabe || R: To Be Hero X / 
158927 | 2027-02-19 bd | AS: Gesamtausgabe || R: Spy × Family: Staffel 2 / 
112609 | 2027-02-05 bd | AS: Gesamtausgabe: Mediabook Edition || R: Elainas Reise / 
813 | 2027-02-19 bd | AS: Box 05/10 (Uncut) || R: Dragon Ball Z / Box 05/10 (Uncut) · Blu-ray + DVD
338 | 2027-01-28 b | AS: Gesamtausgabe (Re-Release) || R: Lady Oscar: Die Rose von Versailles / 
171019 | 2027-01-28 b | AS: Isekai Onsen Paradise || R: Isekai Onsen Paradise / 
127050 | 2026-11-27 b | AS: Gesamtausgabe: Limited Edition || R: Love of Kill / 
166477 | 2027-03-19 b | AS: Gesamtausgabe: Limited Edition || R: The Café Terrace and Its Goddesses / 
178869 | 2026-11-06 b | AS: Vol. 1/2: Limited Edition + Sammelschuber || R: Clevatess / 
183291 | 2026-12-04 b | AS: Gesamtausgabe || R: Pass the Monster Meat, Milady! / 
187663 | 2026-12-04 b | AS: Gesamtausgabe || R: Das Reisetagebuch des Sammlers / 
```
