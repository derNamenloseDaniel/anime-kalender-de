# Gegenentwurf: gemeinsame Auftragsliste für alle Agenten

Stand 28.11.2026, nur Konzept, nichts gebaut. Belege: `Pfad:Zeile` im Stand dieses Zweigs.

## 1. Heute: drei getrennte Listen, nur eine für die Cloud sichtbar

- **Cloud-Orchester:** Aufgaben = neuester `## Nachtrag`-Kommentar plus spätere `## Ergänzung`-Kommentare am Issue 4420 (`docs/wissen/cloud-orchester.md:104`). Kein Besitzer pro Aufgabe, Vergabe nur im Kopf des Orchesters.
- **Lokale Hauptsitzung:** `stand.md` mit Kennzeichen `{Art · Dringlichkeit · Ziel · Eingang}` (`.claude/mods/arbeitsliste/hooks/stand-kennzeichen.mjs:3-6`), Rang über `tools/naechster.mjs`, dessen Pfad fest auf `C:/code/ai/…` zeigt (`tools/naechster.mjs:16`). In der Cloud-Kopie gibt es weder `stand.md` noch `lage.md` (`.gitignore:52`, `ls daniel-zum-abarbeiten`, 28.11.2026).
- **Dauervorrat:** Rangfolge aus `maengel.md`, `check:umfang`, `design-klassen.mjs` (`cloud-orchester.md:107`), nur im Routine-Prompt.
- Folge: Doppelvergabe ist nur durch die Disziplin eines einzigen Vergebers ausgeschlossen; zwei Vergeber (lokal + Cloud) sehen einander nicht.

## 2. Untergrenze (einfachster denkbarer Weg)

Ein GitHub-Issue je Auftrag; Reservierung = ein Kommentar `## Reserviert · <Agent> · bis <UTC>`. Gewinner ist der Kommentar mit der **niedrigsten ID** (vom Server streng aufsteigend vergeben). Wer nach dem Schreiben liest und einen früheren, nicht verfallenen Kommentar findet, zieht seinen zurück. Braucht nur Issue-Kommentare, die die Cloud-Bauer heute schon schreiben (`cloud-orchester.md:31`). Schwäche: zwei Schritte (schreiben, nachlesen), Besitzer-Wechsel nur per Konvention, Verfall nur durch Leser.

## 3. Empfohlener Entwurf

**Datenort:** ein Issue je Auftrag (Label `auftrag`), Titel = Aufgabe, Text = Auftrag, Belege, Patch-Notes-Pflicht (`cloud-orchester.md:85`). Labels tragen das vorhandene Kennzeichen unverändert: `art:*`, `dring:*`, `ziel:*`; „Eingang“ ist `created_at`. Issue 4420 bleibt Briefkasten für Berichte, nicht mehr Liste. Kein D1, keine Datei im Repo (auf `main` schreibt nur der Bestandsbau, ein Pull Request je Zeile wäre die Kette), kein Bezahldienst.

**Reservierung, atomar:** Ref `refs/heads/claim/<issue-nr>` anlegen (`POST /git/refs`). Git lehnt das Anlegen eines vorhandenen Refs serverseitig mit 422 ab: von zwei gleichzeitigen Griffen gewinnt genau einer, ohne Nachlesen, ohne Uhr. Das Ref zeigt auf einen Commit ohne Eltern, dessen Nachricht `{besitzer, start, bis}` trägt. Nur REST, damit es in der Cloud läuft (GraphQL gesperrt, `tools/pr-einreichen.sh:10`).

**Verlängern (Heartbeat) und Freigeben:** Besitzer verlängert alle 20 min mit `PATCH /git/refs/…` auf einen neuen Commit, dessen Elternteil sein letzter Claim-Commit ist (ohne `force`). Hat inzwischen ein anderer das Ref, ist der Commit kein Nachfolger → 422, der Besitzer weiß, dass er verloren hat. Freigabe = `DELETE` des Refs (idempotent), Auftrag erledigt = Issue schließt über `Closes #n` im PR.

**Verfall, wenn der Besitzer schweigt:** „Faul“, ohne Aufseher: scheitert ein Griff mit 422, liest er den Claim-Commit; ist `bis` überschritten, löscht er das Ref und legt es selbst an. Zwei gleichzeitige Übernehmer: Löschen ist idempotent, Anlegen ist atomar → wieder genau einer. TTL 90 min je Bauer (längste gemessene Laufzeit 86 min, typisch 7–16 min: `cloud-orchester.md:18,24`), Heartbeat 20 min. Der stille Bauer (`cloud-orchester.md:25`) fällt damit nach spätestens 90 min zurück in den Vorrat. Nach zweimal Verfall setzt der Aufseher Label `verfallen-2`: geht an den Dirigenten statt an den nächsten Bauer.

**Rang:** dieselbe Ordnung wie heute (Art → Dringlichkeit → Ziel → Eingang), aus den Labels statt aus `stand.md`: `node tools/naechster.mjs --issues` (die Sortierung aus `stand-kennzeichen.mjs` bleibt die eine Quelle; nur die Eingabe wechselt). „Nächster“ = ranghöchster Auftrag ohne Claim-Ref und ohne `wartet:`-Label. Der Griff ist `Rang lesen → Ref anlegen`; verliert er, nimmt er den nächsten.

**Sichtbarkeit:**
- Wahrheit ist die Ref-Liste (`GET /git/matching-refs/heads/claim/`), Anzeige das Label `reserviert` am Issue, gesetzt vom Besitzer nach dem Griff, entfernt von Aufseher und Freigabe (Label ist nie Wahrheit, nie Sperre).
- Handy: GitHub-App, Filter `label:auftrag is:open`; dazu ein angepinntes Lage-Issue mit generierter Tabelle (Auftrag · Rang · Besitzer · bis), vom Aufseher alle 20 min neu geschrieben. Der Aufseher kann der bestehende 20-Minuten-Takt des Nacht-Mergers sein (`cloud-orchester.md:53`) oder die lokale Sitzung; ausfallen darf er, weil Verfall faul geschieht.
- Lokale Hauptsitzung und Cloud-Orchester rufen dieselben zwei Funktionen (`griff`, `freigabe`); Subagenten lokal ebenso. Kein Unterschied zwischen den Beteiligten.

**Übernahme der heutigen Listen (einmalig, danach Einbahn):**
1. Issue 4420: jede Aufgabe des neuesten Nachtrags und jede offene Ergänzung wird ein Issue; die Ergänzung mit VORRANG (`cloud-orchester.md:104`) wird Label `dring:sofort`. 4420 verweist nur noch.
2. `stand.md`: Zeilen mit Art `auftrag`/`eigen`/`angefangen`, die ein Agent bearbeiten kann, werden Issues (Kennzeichen 1:1 zu Labels); die Zeile in `stand.md` wird `→ #<nr>`. Daniels Handgriffe und Fragen (`F<n>`, `E<n>`, „Jetzt“) bleiben in `stand.md`: andere Leser, andere Lebensdauer.
3. Dauervorrat: ein geplanter Lauf (Muster `claude-auftrag.yml`) legt aus den Rängen der Lösungskarte Issues an, mit Obergrenze offener Vorrats-Issues (z. B. 20), damit keine Flut entsteht.
4. PRs: `Closes #n` in der Beschreibung; `tools/liegegut.mjs` bekommt die Spalte „Auftrag“.

## 4. Verworfene Wege

- **Assignee:** mehrere Zuständige erlaubt, kein Ausschluss.
- **Label setzen:** Setzen ist kein Vergleichen-und-Tauschen; zwei Agenten setzen es beide.
- **GitHub Projects:** nur GraphQL, in der Cloud gesperrt (`tools/pr-einreichen.sh:10`).
- **JSON-Datei im Repo:** Konflikte und ein PR je Griff; `main` schreibt nur der Bestandsbau (`CLAUDE.md`, Abschnitt „Daten, Läufe“).
- **D1 / Worker:** nur für Datenläufe vorgesehen; würde den Betrieb mit einem Dienst koppeln, der ausfallen darf, ohne dass Agenten stehen.
- **Actions-`concurrency`:** Warteschlange je Workflow, keine Sperre, die ein Agent hält.

## 5. Risiken

1. **Rechte des Cloud-Tokens:** Darf er Refs außerhalb seines Sitzungszweigs anlegen und löschen? Das Ruleset `main-pruefweg` schützt nur `main`, aber das Cloud-Token war schon bei `SendMessage` auf „nur für eigene Arbeit“ begrenzt (`cloud-orchester.md:41`). Fällt das aus, gilt die Untergrenze aus Abschnitt 2 mit demselben Verfall.
2. **Zeitstempel im Commit stammen vom Client:** falsche Cloud-Uhr verlängert oder verkürzt eine Reservierung. TTL deshalb mit Reserve (90 min gegen 20 min Heartbeat), Aufseher vergleicht mit der eigenen Uhr.
3. **Ref-Müll:** vergessene Refs. Aufseher löscht Refs geschlossener Issues; `claim/*` löst keinen Workflow aus (alle `push`-Trigger sind auf `main` beschränkt, Ausnahme `prtext/**`: `.github/workflows/cloud-abgabe.yml:17-18`, `deploy.yml:4-5`, `bestand-bauen.yml:54-55`).
4. **Ratenlimit:** REST 5000/h je Token, Actions-Token 1000/h je Repo. Rang lesen alle 2 min × 5 Bauer × 2 Aufrufe ≈ 300/h: unkritisch, aber vor dem Bau am echten Takt nachrechnen.
5. **Reservierung ≠ Fortschritt:** ein Bauer kann heartbeaten und nichts tun. Gegenmittel: Verlängern nur mit einem Satz Stand im Claim-Commit; der Aufseher meldet „> 60 min ohne neuen Commit am Zweig“.
6. **Öffentliches Repo:** Aufträge, Besitzer und Fristen sind weltweit lesbar. Keine Personendaten, Zugänge oder Preise in Issue-Texte (Regel wie für `stand.md`-Auszüge).
7. **Zwei Wahrheiten:** Label `reserviert` kann lügen. Deshalb nie für Entscheidungen lesen, nur anzeigen; ein Test vergleicht beide.

## 6. Vor dem Bau messen (Reihenfolge)

1. **Trägt alles:** aus einer Cloud-Sitzung `POST /git/refs` für `refs/heads/claim/test-1` und `DELETE` (zwei Aufrufe, 201/204). Misslingt es, entscheidet das über Abschnitt 3 oder 2.
2. **Atomarität:** 20 × zwei gleichzeitige `POST` auf dasselbe Ref (Cloud + lokal): erwartet je Runde genau ein 201 und ein 422.
3. **Heartbeat als Nachfolger:** `PATCH` ohne `force` vom Besitzer gelingt, derselbe `PATCH` nach Löschen und Neuanlegen durch einen anderen scheitert mit 422.
4. **Uhr:** Abweichung der Commit-Zeit zwischen Cloud-Sitzung, Actions und lokalem Rechner an fünf Proben; TTL muss ein Mehrfaches davon sein.
5. **Takt:** Aufrufzahl je Stunde für fünf Bauer + lokale Sitzung + Aufseher gegen das Limit.
