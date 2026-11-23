---
name: zum-ende-kommen
description: "Bei „zum ende kommen“, „feierabend“, „nichts neues mehr“ (sanft, Standard) und „ende“, „Schluss für heute“ (hart, PC aus), auch mit Uhrzeit: nichts Neues anfangen, Agenten an sauberen Punkt bringen, Laufendes abschließen bzw. stoppen, Übergabe an das Nacht-Orchester (Pflicht) und Memory."
---

# Zum Ende kommen (Daniel, 18.10.2026)

Zwei Modi; in beiden steht am Schluss eine Übergabe, mit der die nächste Sitzung ohne Nachfragen weitermacht.

**Sanft ist der Standard: „zum ende kommen“, „feierabend“, „nichts neues mehr“** (Daniel 23.11.2026 21:45: „mach sanft zum default, damit ich nur zum ende kommen sagen muss“).
- Nichts Neues anfangen, Wecker stoppen (Abschnitt „Was ab jetzt nicht mehr passiert“).
- Laufende Agenten bekommen sofort die Nachricht, an einem sauberen Punkt anzuhalten: Fertiges mit Nachtrag pushen, Halbfertiges als WIP pushen, Bericht schreiben, aufhören.
- Ihre Berichte schließe ich noch ab (Abschnitt „Was trotzdem zu Ende gebracht wird“); laufende Merge-Reihen und Remote-Läufe dürfen auslaufen.
- Der Schnitt (unten) läuft sofort, die Übergabe wird danach mit jedem Bericht nachgeführt; „nichts läuft mehr“ steht erst, wenn alles still ist.

**Hart: „ende“ allein, „Schluss für heute“, „sofort“, „hart“, „PC geht aus“ — der PC wird heruntergefahren** (Daniel 05.11.2026: „wenn ende dann ende. dann darf nichts mehr laufen“). Lokal läuft nichts weiter: Agenten schreiben ihre Übergabe und werden beendet, Merge-Reihen, Monitore und Hintergrundskripte sofort gestoppt (`ps -ef`, Kontrolle: nichts außer der eigenen Shell). „Was trotzdem zu Ende gebracht wird“ gilt nur, soweit es in Minuten erledigt ist; der Rest geht per Schnitt-Schritt 4 remote (GitHub Actions, Cloud) oder bleibt für morgen. Anlass: Eine Merge-Reihe sollte bis 01:34 laufen und blockierte das Git-Update, dazu 62 verwaiste `tail`/`grep`-Monitore.

**Mit Uhrzeit** („ende 23 uhr“): bis dahin normaler Betrieb, ab der Uhrzeit sanft, außer Daniel sagt hart (Abschnitt „Geplantes Ende“).

## Was ab jetzt nicht mehr passiert

- Kein neuer Bauer, keine neue Analyse, kein neuer Plan, kein neuer Punkt aus der Queue — auch nicht auf einem frei gewordenen Platz.
- Eine nächste Runde (R+1) nach einem Prüfer-„ändern“ wird **nicht** gestartet: Auflagen in `stand.md`, „beim nächsten freien Platz“.
- Autonomer Modus endet sofort: eigenen Marker `autonomer-modus/<Sitzungs-ID>.txt` löschen (die alte globale Datei liest niemand mehr; 19.10.2026 hielt sie den grünen Ball fälschlich leer), `ScheduleWakeup({ stop: true })`.

## Was trotzdem zu Ende gebracht wird (zählt nicht als „neu“)

- Ein fertiger Bauer-Bericht wird abgeschlossen: `git status`, pushen (rebaster PR-Zweig mit `--force-with-lease=<zweig>:<alter SHA>`), Konflikt mit main mergen, Nachtrag per `gh pr comment --body-file`, CI abwarten (im Hintergrund), **Prüfer starten** — der Prüfer schließt die laufende Runde ab.
- Ein Prüfer-„frei“ oder eine von mir abgenommene Nachbesserung (eine Prüfrunde, 21.10.2026) wird gemergt, danach `git pull --ff-only`, `laeufe-aufraeumen --trocken`.
- Eine laufende Messung oder ein Lauf, auf den Daniel gerade wartet, wird ausgewertet und gemeldet.
- Daniels Fragen werden weiter beantwortet; ein neuer Auftrag von ihm hebt das Ende auf.

## Der Schnitt, sofort nach „ende“

1. **Bestand aufnehmen:** `ListAgents`/Aufgabenliste (wer läuft noch, woran), `CronList` (sitzungsgebundene Termine), `node C:/code/ai/__assets/tools/prozess-register.mjs aufraeumen --still` und `list`.
2. **Eigene Hintergrundbefehle** ohne Zweck beenden; nur die lassen, deren Ergebnis noch gebraucht wird.
3. **Lagebuch `.claude/dirigent/lage.md` und `stand.md` nachführen** (Skill `daniel-dateien-pflegen`): In-Arbeit-Kopf mit Uhrzeit und „Ende“, jede laufende Sache mit ihrem nächsten Schritt, Auflagen offener Runden, Termine als 📅-Zeile. Lehren aus den letzten Berichten verankern (bauer.md, pruefer.md, Skills).
4. **Übergabe an das Nacht-Orchester — Pflicht in beiden Modi, nie überspringen** (Daniel, 21.11.2026: „übergabe an nacht orchester – wie gestern“; 23.11.2026: „mach das zum teil des zum ende bringen befehls“, nachdem sie wegen fehlenden Labels als „optional“ ausgefallen war). Was über Nacht weiterlaufen soll, bekommt das Cloud-Orchester (Issue 4420, Routine `nacht-orchester`, Label `orchester-aktiv`; Grundauftrag und Rollen stehen im Issue), nicht die lokale Sitzung:
   - Label und Routine prüfen (`gh issue view 4420 --json labels`; Routine per `RemoteTrigger get`). Das Orchester schaltet sich jeden Morgen selbst ab (Label weg, Routine oft `enabled: false`); ein ausgeschaltetes Orchester ist deshalb der Normalfall und nie ein Grund, die Übergabe zu überspringen: `gh issue edit 4420 --add-label orchester-aktiv`, `RemoteTrigger update` mit `{"enabled": true}`, danach `next_run_at` lesen.
   - Ist in der Lage (Kommentar 7055022750) die letzte Nacht „beendet“, braucht die neue Nacht einen Kommentar `## Nachtrag (Nacht <Datum>)`; nur er setzt die Lage zurück, eine Ergänzung allein startet keine neue Nacht. Läuft die Nacht schon, stattdessen `## Ergänzung (Nacht <Datum>, Übergabe Dirigent <HH:MM>) — ersetzt nichts`. Beides per `--body-file`. Inhalt: **A. Angefangenes zuerst.** Je offener PR die Nummer und der Kopf, der Stand (abgenommen, Nachbesserung läuft, Kette rot), die Kommentarkennung der Auflagenliste, wer mergt (Nacht-Merger mit Nachtrag zum Kopf, siehe `tools/nacht-merger-wahl.mjs`) und die Lehre, die nach dem Merge anzuhängen ist. Dazu jeder laufende Cloud-Auftrag mit Name und dem, was er liefert. **B. Neue Aufgaben**, fortlaufend nummeriert, jede mit Pfad und Zeile aus einer Werkzeugausgabe und dem Test, der rot sein muss: **alles remote Machbare** aus `stand.md` („In Arbeit“, dann „Als Nächstes“, in deren Rangfolge) und aus den Vorschlägen des letzten Nachtberichts. Das Orchester kann `stand.md` nicht lesen; was nicht im Kommentar steht, existiert für die Nacht nicht. Nie nur auf alte Listen verweisen (23.11.2026: Verweis auf „Reste der letzten Nacht“ ergab 0 Aufgaben; Daniel: „warum nicht alles was remote machbar ist dem orchester verfügbar machen?“). Sichtung der großen Datei an einen Analysten. **Nicht anfassen:** offene F-Fragen an Daniel.
   - Nachträge nach dem Start gehen als `## Ergänzung` an Issue 4420; das Orchester liest sie beim nächsten Wecken (22.11.2026, `docs/wissen/cloud-orchester.md`, „Ergänzungen und Bauer-Weg“).
   - Auch eine bereits abgenommene PR, die nur noch auf CI wartet, gehört in A. Der Nacht-Merger nimmt sie mit; eine lokale Merge-Wache endet bei hart sofort, bei sanft darf eine schon laufende Reihe auslaufen.
   - Lokal Gebundenes (Meldungskopie, Worker-Deploy, Edge, Mods) kommt nicht in den Kommentar, sondern als Zeile in `stand.md`.
5. **Übergabe schreiben:** Memory `project-uebergabe.md` überschreiben (nicht ergänzen), Zeile in `MEMORY.md` mitziehen. Inhalt:
   - Stand mit Datum und Uhrzeit, Daniels Wortlaut, Modus (autonom aus, Ruhemodus);
   - **was noch läuft und was bei welchem Ergebnis zu tun ist** („frei“ → mergen, „ändern“ → Auflagen eintragen);
   - Warteschlange in Reihenfolge (Verweis auf `stand.md`, nicht kopieren);
   - feste Termine und Crons, die nur in dieser Sitzung leben, samt Ersatzweg, falls die Sitzung endet.
6. **Antwort an Daniel**, drei, vier Sätze: was noch läuft und was ich damit tue, wann der nächste Termin ist, dazu der Link zum Orchester-Kommentar aus Schritt 4 und die Startzeit der Routine (ohne Link ist die Übergabe nicht geschehen). Kein Footer, keine Liste des Erledigten.

## Danach, bis alles still ist

Jeder eintreffende Bericht wird wie oben abgeschlossen, die Übergabe danach im selben Zug nachgeführt (wer nicht mehr läuft, fliegt aus „läuft noch“). Ist nichts mehr offen, steht in der Übergabe „nichts läuft mehr“ und im Chat ein Satz dazu. Kein Wecker, keine Schleife — die Berichte wecken von selbst.

## Geplantes Ende („ende 23 uhr“, Daniel 18.10.2026)

Nennt Daniel eine Uhrzeit, gilt bis dahin der normale Betrieb; um die Uhrzeit startet der Schnitt von selbst, ohne dass er „ende“ schreiben muss.

1. **Sofort:** Uhrzeit als ISO mit Offset in `~/.claude/ende-um.txt` (z. B. `2026-10-18T23:00:00+02:00`), Zeile in `stand.md`, Daniel einen Satz bestätigen. Läuft ein autonomer Modus mit späterem Ende, gewinnt die frühere Zeit.
2. **Bis dahin:** Das Hook-Modul `ende-termin.mjs` meldet an jeder Eingabe „[Ende geplant HH:MM (in N min) …]“ — kein `ScheduleWakeup` über diese Zeit hinaus, der letzte Wecker fällt genau auf sie. Neue Agenten nur, wenn ihr Bericht realistisch vorher kommt; sonst gleich in die Übergabe.
3. **Ab der Uhrzeit** meldet das Modul „[Ende fällig …]“: Schnitt wie oben, dann `ende-um.txt` löschen. Ohne diesen Wecker endet der Turn und nichts passiert — der Wecker ist der Auslöser, nicht der Vorsatz.

- **Reste (Lehre 125, 17.11.2026):** Was in einem Übergabeordner liegt, bekommt im selben Zug einen Besitzer (auswerten, sichern oder löschen), auch wenn es älter als der Auftrag ist. Was die Sitzung überdauern soll, liegt unter `C:/code/ai/__assets/notes/<thema>/` mit Löschbedingung; das Scratchpad ist nur für Wegwerfbares. Zum Tagesende eine Zeile „Reste von heute“.
