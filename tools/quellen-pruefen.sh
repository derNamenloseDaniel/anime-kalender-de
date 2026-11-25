#!/usr/bin/env bash
#
# Prüft, was ein Sammel-Lauf einreichen will, bevor der Pull Request entsteht (17.10.2026).
# Anlass: Ein Sammler-PR brachte zwei Sammlerdateien in Widerspruch (aniSearch-Kennung 18892: Dub-Liste „geplant", Eintrag „nicht genannt");
# erst der Bestandsbau merkte es, und `main` war über sieben Stunden rot.
#
# Wird mit `source` geladen (`quellen-pr.sh`). `quellen_pruefen` läuft im Arbeitsverzeichnis des Sammlers, auf dem Stand, der eingereicht wird.
# Rückgabe: Exit 0 = grün; sonst rot, auch wenn die Prüfung nicht startet oder die Frist reißt. Auf stdout steht dann der Grund (alle roten Prüfungen),
# das ganze Protokoll geht nach stderr. `check:logic` liest nur `data/` und den Code, nie `public/data` (Sperre), und braucht kein Chromium.
#
# `quellen_neue_fehler` zieht davon ab, was `origin/main` selbst schon rot hat: Ist `main` rot, markiert nicht jeder Sammler seinen PR, und nach der Reparatur
# bleibt nichts liegen. Verglichen wird je Prüfung (die Zeilen `  - <Prüfdatei>`), nicht je Fehler: Ist eine Prüfung auf `main` schon rot, fällt ein neuer
# Fehler des Funds in derselben Prüfung nicht auf und wird gemergt. Tragbar, weil `main` dann ohnehin rot und im Bestandsbau sichtbar ist.
#
# Das App-Token (GH_TOKEN) sieht die Prüfung nicht: Es mergt am Ruleset vorbei und gehört nur `quellen-pr.sh` (`tools/app-token-sperre.mjs`).
#
# `QUELLEN_PRUEFBEFEHL` und `QUELLEN_PRUEFFRIST` sind Schalter für den Test; kein Workflow setzt sie (`tools/sammler-pruefschritt-waechter.test.mjs`).

# Fristen (03.11.2026): check:logic braucht in der CI rund 6,5 bis 7 Minuten (am 17.10.2026 unter einer; gemessen 6 min 43 s Wandzeit im Lauf 41595064044);
# die Dauer je Prüfung steht seitdem im CI-Log (Job „Kette – Logik“) als Zeilen „check:logic Dauer:“. 600 s lassen rund 3 Minuten Luft; ab 9 Minuten Wandzeit neu rechnen. Fund und Vergleich auf `main` zusammen samt dem
# übrigen Job passen in den kleinsten Job-Timeout eines Einreichers; das rechnet der Wächter aus den Workflows nach (`pruefeFristen` in `tools/sammler-pruefschritt-waechter.mjs`).
QUELLEN_PRUEFFRIST_STANDARD=600
QUELLEN_BASISFRIST_STANDARD=240

quellen_pruefen() {
  local protokoll status=0
  protokoll="$(mktemp)"
  CI=true timeout "${QUELLEN_PRUEFFRIST:-$QUELLEN_PRUEFFRIST_STANDARD}" \
    env -u GH_TOKEN -u GITHUB_TOKEN bash -c "${QUELLEN_PRUEFBEFEHL:-npm run check:logic -- --alle}" > "$protokoll" 2>&1 || status=$?
  cat "$protokoll" >&2
  if [ "$status" = 0 ]; then
    rm -f "$protokoll"
    return 0
  fi
  if [ "$status" = 124 ]; then
    echo "Die Prüfung brauchte länger als ${QUELLEN_PRUEFFRIST:-$QUELLEN_PRUEFFRIST_STANDARD} s und wurde abgebrochen."
  elif grep -qE '^  - ' "$protokoll"; then
    grep -E '^  - ' "$protokoll"
  else
    echo "Die Prüfung endete mit Exit $status:"
    tail -n 5 "$protokoll"
  fi
  rm -f "$protokoll"
  return 1
}

# Nur die roten Prüfdateien des Funds (Zeilen `  - <pfad>` in $1), einzeln auf dem Stand von main (Arbeitsverzeichnis = Arbeitsbaum von main).
# Der volle check:logic braucht rund 8 Minuten und riss die Vergleichsfrist; so bleibt es bei Sekunden (25.11.2026, PR 4979/5013).
# stdout: die auf main roten Dateien als `  - <pfad>`; jede andere Zeile heißt „Basis nicht prüfbar“ (Grund steht im PR-Text, `quellen_neue_fehler`).
quellen_pruefen_dateien() {
  local frist="${QUELLEN_PRUEFFRIST:-$QUELLEN_BASISFRIST_STANDARD}" ende datei rest status
  ende=$((SECONDS + frist))
  [ -e node_modules ] || { echo "Basis nicht prüfbar: node_modules fehlt im Arbeitsbaum von main."; return 0; }
  while IFS= read -r datei; do
    datei="${datei#  - }"
    # Eine Prüfdatei, die es auf main nicht gibt, ist dort nicht rot: ihr Fehler ist neu.
    [ -f "$datei" ] || continue
    rest=$((ende - SECONDS))
    if [ "$rest" -le 0 ]; then echo "Basis nicht prüfbar: Frist von ${frist} s vor ${datei} erreicht."; return 0; fi
    status=0
    CI=true timeout "$rest" env -u GH_TOKEN -u GITHUB_TOKEN npx --no-install tsx "$datei" >&2 || status=$?
    case "$status" in
      0) ;;
      124) echo "Basis nicht prüfbar: ${datei} brauchte länger als die Frist von ${frist} s."; return 0 ;;
      126|127) echo "Basis nicht prüfbar: ${datei} startete nicht (Exit ${status})."; return 0 ;;
      *) echo "  - ${datei}" ;;
    esac
  done <<< "$1"
}

# $1 = stdout von `quellen_pruefen` (die roten Prüfungen des Funds). Dieselben Prüfdateien auf dem Stand von `origin/main` (eigener Arbeitsbaum, `node_modules`
# verlinkt); stdout wie bei `quellen_pruefen_dateien`. Nie ein Abbruch. Mit QUELLEN_PRUEFBEFEHL (Test) läuft statt der Dateien dieser Befehl als Ganzes.
quellen_pruefen_main() {
  local dir status=0
  dir="$(mktemp -d)"
  if git worktree add --detach --quiet "$dir/main" origin/main >&2; then
    if [ -e node_modules ]; then ln -s "$PWD/node_modules" "$dir/main/node_modules"; fi
    # Exit 1 = main selbst ist rot (die Liste auf stdout ist der Befund); jeder andere Exit bleibt sichtbar statt verschluckt.
    (
      cd "$dir/main" || exit 2
      if [ -n "${QUELLEN_PRUEFBEFEHL:-}" ]; then
        QUELLEN_PRUEFFRIST="${QUELLEN_PRUEFFRIST:-$QUELLEN_BASISFRIST_STANDARD}" quellen_pruefen
      else
        quellen_pruefen_dateien "${1:-}"
      fi
    ) || status=$?
    if [ "$status" -gt 1 ]; then
      echo "Die Prüfung auf main konnte nicht laufen (Exit $status); der Vergleich gilt ohne Basis." >&2
      echo "Basis nicht prüfbar: Die Prüfung auf main konnte nicht laufen (Exit $status)."
    fi
    rm -f "$dir/main/node_modules"
    git worktree remove --force "$dir/main" >&2 || true
  else
    echo "Kein Arbeitsbaum für origin/main; der Vergleich gilt ohne Basis." >&2
    echo "Basis nicht prüfbar: kein Arbeitsbaum für origin/main."
  fi
  rm -rf "$dir"
}

# $1 = stdout von `quellen_pruefen` (rot). Gibt aus, was davon neu ist gegenüber `main`; leer = `main` hat dieselben Fehler schon.
# Nur eine Liste roter Prüfungen ist vergleichbar; Frist, Absturz und alles andere bleiben ganz stehen (rot). Ist die Basis nicht prüfbar, steht der Grund
# als erste Zeile davor und damit im PR-Text (25.11.2026: vorher blieb der Fund ohne Hinweis rot liegen).
quellen_neue_fehler() {
  local fund="$1" basis
  if printf '%s\n' "$fund" | grep -qvE '^  - '; then
    printf '%s\n' "$fund"
    return 0
  fi
  basis="$(quellen_pruefen_main "$fund")" || basis=""
  if printf '%s\n' "$basis" | grep -qvE '^  - |^$'; then
    printf 'Vergleich mit main nicht möglich, alle roten Prüfungen gelten als neu. %s\n' "$(printf '%s\n' "$basis" | grep -vE '^  - |^$' | head -1)"
    printf '%s\n' "$fund"
    return 0
  fi
  printf '%s\n' "$fund" | grep -vxFf <(printf '%s\n' "$basis") || true
}
