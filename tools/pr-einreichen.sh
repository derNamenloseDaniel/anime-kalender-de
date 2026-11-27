#!/usr/bin/env bash
#
# Den aktuellen Zweig als Pull Request einreichen (kein Auto-Merge).
#
# Seit dem 11.10.2026 schützt das Ruleset `main-pruefweg` den Hauptzweig: Direkt-Pushes sind nur der Daten-App erlaubt. Alles andere geht als Pull
# Request. Seit 19.10.2026 mergt nichts von selbst: erst `node tools/pr-nachrechnen.mjs <PR>` (Exit 0), dann `gh pr merge <PR> --squash`. Kein `--admin`.
#
# Aufruf: bash tools/pr-einreichen.sh "<Titel>" ["<Text für die Squash-Nachricht>"]
# `PR_BASIS=zug` setzt eine andere Basis als main (Sammelzug). Der Text gehört beim Merge als --body in die Squash-Nachricht (das Skript druckt den Befehl); `deploy.yml` liest dort `[schlank]`.
# Alles über REST (`gh api`): Cloud-Sitzungen sperren GraphQL, die `gh pr`-Befehle scheitern dort mit HTTP 403 (gemessen 27.11.2026).
# Sonst öffneten Cloud-Aufträge ihre PRs an dieser Vorprüfung vorbei (Wellen-PRs 5130–5146: Patch-Notes-Pflicht in allen zwölf rot).
set -euo pipefail

TITEL="${1:?Titel fehlt}"
TEXT="${2:-}"
ZWEIG="$(git rev-parse --abbrev-ref HEAD)"
if [ "$ZWEIG" = HEAD ] || [ "$ZWEIG" = main ]; then
  echo "✖ Ein Pull Request braucht einen eigenen Zweig (aktuell: $ZWEIG)." >&2
  exit 1
fi

# Offener PR dieses Zweigs: Feld (number, body, html_url) oder leer. `{owner}/{repo}` löst gh aus dem Git-Remote auf.
EIGNER="$(gh api 'repos/{owner}/{repo}' --jq .owner.login)"
pr_feld() { gh api -X GET 'repos/{owner}/{repo}/pulls' -f head="$EIGNER:$ZWEIG" -f state=open --jq ".[0].$1 // empty"; }

# Vorprüfung (tools/pr-vorpruefung.mjs): fängt vor dem Push, was der CI-Prüfer sonst mit „ändern“ zurückgibt. Rot bricht ab.
# Gibt es den PR schon, gilt seine (unveränderliche) Beschreibung, sonst der Text dieses Aufrufs.
if [ -n "$(pr_feld number)" ]; then
  PR_TEXT="$(pr_feld body)"
else
  PR_TEXT="${TEXT:-$TITEL}"
fi
export PR_TEXT
node tools/pr-vorpruefung.mjs --titel "$TITEL" || { echo "✖ Einreichen abgebrochen: Vorprüfung rot (Befunde oben)." >&2; exit 1; }

git push -q -u origin "$ZWEIG"
if [ -z "$(pr_feld number)" ]; then
  gh api 'repos/{owner}/{repo}/pulls' -f title="$TITEL" -f head="$ZWEIG" -f base="${PR_BASIS:-main}" -f body="${TEXT:-$TITEL}" --silent
fi
PR_URL="$(pr_feld html_url)"
PR_NR="$(pr_feld number)"
echo "PR eingereicht: $PR_URL"
echo "Nächster Schritt (kein Auto-Merge): node tools/pr-nachrechnen.mjs $PR_NR, bei Exit 0 dann:"
if [ -n "$TEXT" ]; then
  printf '  gh pr merge %s --squash --delete-branch --match-head-commit <sha vor dem Nachrechnen> --body %q
' "$PR_NR" "$TEXT"
else
  echo "  gh pr merge $PR_NR --squash --delete-branch --match-head-commit <sha vor dem Nachrechnen>"
fi
