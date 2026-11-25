#!/usr/bin/env bash
#
# Markierte Sammler-PRs („[Prüfung rot]“, Label `pruefung-rot`, `tools/quellen-pr.sh`) neu prüfen, sobald main wieder grün ist (25.11.2026).
# Anlass: Zwei Sammler-PRs (4979 nach 9 h, 5013) blieben liegen, nur weil main beim Einreichen selbst rot war; danach kollidierten sie mit main.
#
# Aufruf (im Repo, `node_modules` installiert): bash tools/rote-sammler-erneut.sh <PR-Nummer>...
# Je PR: Stand des PR-Zweigs mit aktuellem main zusammenführen (nur lokal, nichts wird gepusht), dieselbe Prüfung wie beim Einreichen
# (`quellen_pruefen`, dann `quellen_neue_fehler` gegen main). Keine neuen Fehler → Titelmarke und Label weg, Hinweis am PR; sonst bleibt alles stehen
# und der Grund im Hinweis wird aktualisiert (ein Kommentar je PR, erkannt an `KOMMENTAR_KENNUNG` in tools/rote-sammler-erneut.mjs).
# Nach `$GITHUB_OUTPUT`: `freigegeben=<Nummern>`; der Workflow stößt dann den Daten-Merge an (`claude-daten-merge.yml` mergt, löst Konflikte).
# Braucht nur GH_TOKEN (GITHUB_TOKEN mit pull-requests: write); das App-Token sieht dieser Lauf nie, und die Prüfung läuft ohne jedes Token (`quellen_pruefen`).
# Exit 1, wenn bei einem PR ein Schritt scheiterte; die übrigen PRs werden trotzdem bearbeitet.

set -uo pipefail
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=tools/quellen-pruefen.sh
source "$WURZEL/tools/quellen-pruefen.sh"

# Wie in tools/quellen-pr.sh (`tools/rote-sammler-erneut.test.mjs` hält die Werte gleich).
MARKE_ROT="[Prüfung rot]"
LABEL_ROT="pruefung-rot"
KENNUNG='<!-- sammler-rot-erneut -->'

# Stdout: erste Zeile gruen|gleich|neu|konflikt, danach der Text dazu. Eigener Arbeitsbaum, damit das laufende Skript nicht unter sich getauscht wird.
erneut_befund() {
  local nr="$1" dir befund grund text=""
  # main zuerst: jeder `git fetch` überschreibt FETCH_HEAD, der Arbeitsbaum soll den PR-Stand tragen.
  git fetch --quiet origin main || return 1
  git fetch --quiet origin "pull/$nr/head" || return 1
  dir="$(mktemp -d)"
  git worktree add --detach --quiet "$dir/pr" FETCH_HEAD >&2 || { rm -rf "$dir"; return 1; }
  if [ -e "$WURZEL/node_modules" ]; then ln -s "$WURZEL/node_modules" "$dir/pr/node_modules"; fi
  if ! git -C "$dir/pr" -c user.name=pruefung -c user.email=pruefung@localhost merge --no-edit --quiet origin/main >&2; then
    git -C "$dir/pr" merge --abort >&2 || true
    befund=konflikt
  elif grund="$(cd "$dir/pr" && quellen_pruefen)"; then
    befund=gruen
  else
    text="$(cd "$dir/pr" && quellen_neue_fehler "$grund")"
    if [ -n "$text" ]; then befund=neu; else befund=gleich; fi
  fi
  rm -f "$dir/pr/node_modules"
  git worktree remove --force "$dir/pr" >&2 || true
  rm -rf "$dir"
  printf '%s\n%s\n' "$befund" "$text"
}

# Genau ein Kommentar mit der Kennung je PR: vorhanden → Text ersetzen (still), sonst anlegen.
kommentar_setzen() {
  local nr="$1" datei="$2" id
  id="$(gh api "repos/${GITHUB_REPOSITORY}/issues/$nr/comments" --paginate -q ".[] | select(.body | contains(\"$KENNUNG\")) | .id" | head -1)" || return 1
  if [ -n "$id" ]; then
    gh api -X PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/$id" -F "body=@$datei" > /dev/null
  else
    gh pr comment "$nr" --body-file "$datei" > /dev/null
  fi
}

# Ein PR; Rückgabe 0 = bearbeitet (auch „bleibt“), 1 = ein Schritt scheiterte. Freigegebene Nummern sammelt FREIGEGEBEN.
erneut_pr() {
  local nr="$1" titel ergebnis befund text datei entscheidung
  titel="$(gh pr view "$nr" --json title -q .title)" || return 1
  case "$titel" in
    "$MARKE_ROT"*) ;;
    *) echo "PR $nr trägt keine Marke mehr: übersprungen."; return 0 ;;
  esac
  ergebnis="$(erneut_befund "$nr")" || { echo "::warning::PR $nr: Zweig oder main nicht abrufbar, nichts geändert."; return 1; }
  befund="${ergebnis%%$'\n'*}"
  text="${ergebnis#*$'\n'}"
  datei="$(mktemp)"
  entscheidung="$(printf '%s\n' "$text" | node "$WURZEL/tools/rote-sammler-erneut.mjs" entscheide "$befund" "$datei")" || { rm -f "$datei"; return 1; }
  if [ "$entscheidung" = freigeben ]; then
    # Erst der Titel (er entscheidet, ob der Merge den PR nimmt), das Label ist eine Zugabe.
    gh pr edit "$nr" --title "$(node "$WURZEL/tools/rote-sammler-erneut.mjs" ohne-marke "$titel")" > /dev/null || { rm -f "$datei"; return 1; }
    gh pr edit "$nr" --remove-label "$LABEL_ROT" > /dev/null 2>&1 || true
    FREIGEGEBEN="${FREIGEGEBEN:+$FREIGEGEBEN }$nr"
  fi
  kommentar_setzen "$nr" "$datei" || { echo "::warning::PR $nr: Hinweis konnte nicht gesetzt werden."; rm -f "$datei"; return 1; }
  rm -f "$datei"
  echo "PR $nr: $befund → $entscheidung"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  FREIGEGEBEN=""
  fehler=0
  for nr in "$@"; do
    erneut_pr "$nr" || fehler=1
  done
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "freigegeben=$FREIGEGEBEN" >> "$GITHUB_OUTPUT"; fi
  exit "$fehler"
fi
