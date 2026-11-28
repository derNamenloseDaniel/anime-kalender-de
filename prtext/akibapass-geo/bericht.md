# Akibapass aus CI: Geo-Sperre (28.11.2026)

## Messung aus dieser Cloud-Sitzung
Jeder Abruf scheitert schon am Agent-Proxy (`curl: (56) CONNECT tunnel failed, response 403`, HTTP 000, kein Zielserver erreicht):

| Adresse | Ergebnis |
|---|---|
| https://www.akibapass.tv/robots.txt | Proxy 403 |
| https://www.akibapass.tv/products/call-of-the-night-de-season-1 | Proxy 403 |
| https://akibapasstv.vhx.tv/products/call-of-the-night-de-season-1 | Proxy 403 |
| https://api.vhx.tv/ | Proxy 403 |
| https://web.archive.org/web/2024/https://www.akibapass.tv/robots.txt | Proxy 403 |

Die Hosts stehen nicht auf der Freigabeliste des Proxys. Von hier ließ sich also **kein** Kandidatenweg (VHX-.json, oEmbed, Feeds, Sitemap, Archive) messen; Statuscodes des Ziels kennen wir nur aus dem Lauf 46139426422 (404 aus CI, 200 von deutscher IP). Das ist **offen**, nicht widerlegt.

## Gebaut
Nur die Zählung: HTTP 404 auf einer Akibapass-Produktseite zählt je Host als `geoGesperrt`, erscheint in der Lauf-Zeile („N geo-gesperrt (404)“) und löst bei einem Host ohne einen einzigen Treffer eine Sammelwarnung aus. Bisher: stille Einzelwarnung je Adresse. 404 sperrt den Host nicht (Seite für Seite weiter, damit ein einzelner echter 404 keine anderen Seiten kostet). Eine echt fehlende Seite ist von Geo-404 nicht unterscheidbar; deshalb die Sammelwarnung nur bei null Treffern.

## Alternativen (nicht gebaut), mit Aufwand
1. **Lauf von einer deutschen IP**: selbst gehosteter GitHub-Runner (z. B. Heimserver/kleiner DE-VPS), Workflow `data:akibapass-sprache` mit `runs-on: [self-hosted, de]`. Aufwand mittel, laufende Pflege eines Rechners; Regel „Sammler liefern per PR“ bleibt.
2. **DE-Egress-Proxy** nur für diese Hosts (Cloudflare-Worker hilft nicht: Worker laufen am Rand des Anfragenden, nicht in DE). Aufwand klein bis mittel, zusätzlicher Dienst.
3. **Handbelege** (`data/dub-confirmed.yaml`) für die 28 Seiten, einmalig von Daniels IP geprüft. Aufwand: einmal pro Seite, veraltet mit jeder neuen Staffel.
4. **Offene Messung**: aus einer Umgebung mit freiem Netz (CI) die Kandidaten VHX-.json/oEmbed/Sitemap je mit einer Adresse und robots.txt vorab messen; ob sie Geo-Sperre umgehen, ist unbekannt und dürfte bei Cloudflare-Geo-Regel nicht der Fall sein.
