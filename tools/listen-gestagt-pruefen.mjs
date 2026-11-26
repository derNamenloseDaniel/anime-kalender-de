#!/usr/bin/env node
/**
 * Pre-commit-Prüfung: gestagte Prüflisten (`tools/check-*-liste.txt`) müssen sortiert und ohne Doppelzeile sein.
 * Dieselbe Regel wie `check:logic` und `pr-vorpruefung` (`tools/liste-pruefen.mjs`), nur über den Index: Eine Nachbesserung
 * am PR ging an der Sortierung vorbei und fiel erst in der CI auf (Fall 4857). Gelesen wird der gestagte Inhalt.
 * Eingebunden über `bash tools/quellen-commit-wache.sh --einrichten`.
 */
import { execFileSync } from 'node:child_process'
import { listenEintraege, listenFehler } from './liste-pruefen.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26, timeout: 30000 })
const PRUEFLISTE = /^tools\/check-[\w-]*liste\.txt$/

/** Gestagte, nicht gelöschte Prüflisten. */
export function gestagteListen(lies = git) {
  return lies('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter((d) => PRUEFLISTE.test(d))
}

/** Fehltexte aller gestagten Listen (leer = in Ordnung). */
export function listenRot(lies = git) {
  return gestagteListen(lies).flatMap((d) => listenFehler(listenEintraege(lies('show', `:${d}`)), d))
}

function main() {
  const fehler = listenRot()
  if (!fehler.length) return 0
  console.error(`listen-gestagt-pruefen: Commit angehalten (${fehler.length} Fehler):`)
  for (const f of fehler) console.error(`  ✖ ${f}`)
  return 1
}

if (import.meta.filename === process.argv[1]) process.exit(main())
