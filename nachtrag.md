# Nachtrag

Kopf 52d1d871 (Merge origin/main, kein Rebase). Nur data/-Dateien geändert.

1. **Index, Staffel 3 (25 Folgen):** zweiteQuelle entfernt (Zitat gilt „ersten beiden Staffeln“).
2. **Je Zeile geprüft** (Zitat → trägt?):

| Zeile | Zitat | trägt |
|---|---|---|
| Index S3, 25 Folgen | erste beiden Staffeln | nein, entfernt |
| Index / Index II, 24 Folgen | erste beiden Staffeln | ja |
| Yu-Gi-Oh! ARC-V, alle 9 Zeilen (49/50 Folgen, B08CGK5645 u. a.) | nur Erstausstrahlung ab 12.03.2015, kein Umfang | nein, entfernt |
| Blood Blockade Battlefront (2 Zeilen) | Sprecherliste der Serie von 2015 | ja |
| „& Beyond“ (B0B8RP33YD) | Artikel behandelt nur die Serie 2015 | nein, entfernt |
| Danmachi Sword Oratoria, Arrow of the Orion | LAB-SIX-Satz nennt beide Titel | ja |
| übrige (Pororo, Tsubasa, Golden Time, Hanni, Railgun S, Sword of the Stranger, AnoHana, Giovannis Insel, Es war einmal ×3, Super Wings) | Serie/Film bzw. Staffel im Zitat | ja |

3. **Umfang:** `git diff --stat origin/main...HEAD` zeigt dub-confirmed, erstausgabe-von-hand und die Patchnote; ohne-synchro-von-hand ist nach Punkt 4 unverändert.
4. **Rockman.EXE AXESS (2108):** Zeile samt Kommentar entfernt.
5. **Patchnote:** 21 → 17 (17 Titel mit zweiteQuelle; 4792, 4793, 1023 nicht mitgezählt).
6. **pokewiki.de:** aus der Cloud nicht erreichbar (Host nicht freigegeben, WebFetch ENOTFOUND), also nicht gelesen. Beide Adressen als Beleg entfernt; 4792/4793 stützen sich nur noch auf die Wikipedia-Liste.

Prüfungen: `tsc --noEmit` grün. `check-handbelege` meldet 16 Verstöße (auf main 0): Die Zeilen mit zweiteQuelle heben den Kanal-Titel-Riegel erst nach neuem Bestandsbau auf; ohne data/cache lässt sich der Datensatz hier nicht neu bauen. Nach dem Bau erneut prüfen.
