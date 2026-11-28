# Messung: Git-Ref als atomare Reservierung für die Auftragsliste

Gemessen am 28.11.2026 aus einer Cloud-Sitzung (Git-Proxy), Repo `derNamenloseDaniel/anime-kalender-de`, Testkennung `48002510`. Nur gemessen, nichts gebaut.

## Ergebnis in einem Satz

Ein **Zweig** `claude/auftrag-…` taugt als atomare Reservierung (5 von 5 Wettläufen mit genau einem Gewinner, rund 1,6 s je Push). Ein eigener Ref-Namensraum `refs/auftraege/…` geht durch den Proxy **nicht**. **Löschen** ist aus der Cloud nicht möglich, die Test-Zweige stehen noch (siehe unten).

## Tabelle je Weg

| Weg | atomar? (Beleg) | Latenz je Push | aus Cloud nutzbar? | Grenzen |
|---|---|---|---|---|
| `refs/auftraege/test-ZUFALL` (eigener Namensraum) | nicht prüfbar: Push scheitert | 1,1 s bis zur Ablehnung | **nein** | Wortlaut unten (HTTP 403). Lokal ohne Proxy vermutlich möglich, nicht gemessen. |
| Zweig `claude/auftrag-test-…` (neuer Ref, zwei Pushes mit verschiedenen SHAs) | **ja**: 5 Runden, je genau 1 Gewinner, 1 Ablehnung `cannot lock ref … reference already exists`. Gewinner: B, B, A, A, A (Reihenfolge zufällig). | 1,52 bis 1,81 s (Mittel ≈ 1,6 s) | **ja** | Der Verlierer erfährt es sofort und eindeutig. Zweige sind im Repo sichtbar (Zweigliste, `ls-remote`). |
| Zweig, nicht fast-forward ohne Force | **ja**: `! [rejected] … (non-fast-forward)` | 0,37 s | ja | Ein Fremder kann eine Reservierung nicht überschreiben. |
| Zweig, gleicher SHA erneut | `Everything up-to-date`, kein Fehler | – | ja | Zwei Sitzungen mit **gleichem** SHA sind nicht unterscheidbar: der SHA muss je Sitzung verschieden sein (Sitzungskennung in die Commit-Nachricht). |
| Zweig, Fast-forward-Update durch den Besitzer | ja, Update ging durch | ≈ 1,6 s | ja | Wer die Reservierung kennt, kann sie fortschreiben (z. B. Herzschlag/Fristverlängerung). |
| Zweig mit `--force-with-lease` und falschem Erwartungswert | `! [rejected] (stale info)` | – | ja | Lease-Prüfung greift lokal; Rekord nicht serverseitig atomar erzwungen, aber ohne Force greift die Serverseite. |
| Zweig ohne Präfix `claude/` (`auftrag-test-…`) | Push ging durch | 1,6 s | ja | Der Proxy erzwingt `claude/` nicht. |
| Löschen (`git push --delete`, `:ref`) | – | 0,4 s bis zur Ablehnung | **nein** | `send-pack: unexpected disconnect while reading sideband packet` / `the remote end hung up unexpectedly`. |
| Löschen per REST (`gh api -X DELETE …/git/refs/heads/…`) | – | 0,1 bis 0,3 s | **nein** | `Write access to this GitHub API path is not permitted through this proxy. (HTTP 403)`. Im MCP gibt es kein `delete_branch`. |
| Issue als Reservierung | **nur aus Doku bewertet, nicht gemessen** (siehe unten) | – | offen | – |

## 1) Wortlaut des gesperrten Pushes

Befehl: `git push origin HEAD:refs/auftraege/test-48002510`

```
error: RPC failed; HTTP 403 curl 22 The requested URL returned error: 403
send-pack: unexpected disconnect while reading sideband packet
fatal: the remote end hung up unexpectedly
Everything up-to-date
```

`git ls-remote origin 'refs/auftraege/*'` danach: leer (nichts angelegt).

## 4) Issue-Weg (nur Dokumentation, kein Issue angelegt)

Aus der GitHub-REST-Doku, nicht gemessen:

- Ein Issue anlegen ist **nicht** atomar gegen ein anderes Issue gleichen Titels: GitHub kennt keine Eindeutigkeit über Titel. Zwei Sitzungen können beide „Auftrag X reserviert“ anlegen und beide Erfolg sehen. Eindeutigkeit gäbe es nur über die Issue-Nummer (fortlaufend), das ist eine Warteschlange, keine Sperre.
- Ein „Assignee setzen“ oder „Label setzen“ ist ein Überschreiben ohne Vergleichswert (kein `If-Match`/ETag bei Schreibzugriffen auf Issues): letzter Schreiber gewinnt. Nicht atomar.
- Kommentar-Reihenfolge (erster Kommentar gewinnt) wäre ein Wettlauf mit nachträglichem Lesen, atomar nur über die serverseitige Reihenfolge der Kommentar-IDs; das braucht zwei Aufrufe (schreiben, dann lesen).
- Aus der Cloud: Der Proxy sperrt in dieser Sitzung GraphQL und viele REST-Schreibpfade (siehe 403 oben); Issues und Kommentare über den GitHub-MCP sind in diesem Projekt nur auf Anweisung vorgesehen. Ob Issue-Schreiben durch den Proxy geht, ist **offen**.
- Fazit: schwächer als der Zweig-Weg.

## Empfehlung

1. Reservierung = ein neuer Zweig `claude/auftrag-<auftragskennung>`, dessen Commit die Sitzungskennung trägt (verschiedene SHAs je Sitzung). Wer den Push gewinnt, besitzt den Auftrag; `reference already exists` heißt „vergeben“. Das gilt aus der Cloud und lokal gleichermaßen und ist serverseitig atomar.
2. Das Freigeben (Löschen) geht aus der Cloud **nicht**. Das müsste die lokale Sitzung oder ein Workflow mit App-Token tun (Räumlauf, z. B. im bestehenden `laeufe-aufraeumen`). Ohne Räumung wächst die Zweigliste; Auftragskennungen sollten deshalb eindeutig und nie wiederverwendet sein, oder die Freigabe wird als Fast-forward-Commit „frei“ auf den Zweig geschrieben statt als Löschung.
3. `refs/auftraege/…` nur weiterverfolgen, wenn die lokale Sitzung ihn ohne Proxy nutzt; für Cloud-Sitzungen entfällt er.

## Offen

- Eigener Namensraum von der lokalen Sitzung aus (ohne Proxy): nicht gemessen, aus dieser Sitzung nicht prüfbar.
- Verhalten bei mehr als zwei gleichzeitigen Pushern und bei Rate-Limits: nicht gemessen (nur 2 × 5 Pushes).
- Issue-Weg: nur Doku, keine Messung.
- Wettlauf-Messung hatte zwei Pushes aus derselben Sitzung/demselben Rechner; zwei getrennte Container sind nicht geprüft, die Atomarität liegt aber serverseitig bei GitHub (`cannot lock ref`).

## Aufräumen: nicht vollständig (Hürde)

Die Löschung der eigenen Test-Zweige war aus der Cloud nicht möglich (siehe Tabelle). `git ls-remote origin '*auftrag-test*'` zeigt nach dem Lauf noch sieben Zweige:

```
refs/heads/auftrag-test-48002510
refs/heads/claude/auftrag-test-48002510
refs/heads/claude/auftrag-test-48002510-r1
refs/heads/claude/auftrag-test-48002510-r2
refs/heads/claude/auftrag-test-48002510-r3
refs/heads/claude/auftrag-test-48002510-r4
refs/heads/claude/auftrag-test-48002510-r5
```

Alle zeigen auf leere Test-Commits ohne Dateiänderung. Löschen von außerhalb der Cloud (lokal oder Workflow):
`git push origin --delete <zweig>` je Zweig. Auf `main` wurde nichts gepusht; keine Issues oder Kommentare angelegt.
