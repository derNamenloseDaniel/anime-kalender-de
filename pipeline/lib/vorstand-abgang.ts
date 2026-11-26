import { execFileSync } from 'node:child_process'
import { ROOT } from './util.ts'

/**
 * Vorstand für Bestandswachen: die zuletzt eingecheckte Fassung (`HEAD`, im Bestandsbau = origin/main vor dem Commit). Eine Wache,
 * deren Soll-Liste derselbe Bau schreibt, bestätigt sich sonst selbst: Streicht der Bau einen Eintrag aus Liste und Ausgabe zugleich,
 * bleibt sie grün. Gegen den Vorstand fällt dieser Abgang auf.
 */
const git = (...a: string[]): string =>
  execFileSync(process.env.GIT_EXE ?? 'git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })

/** `--vorstand <ref>` aus den Argumenten, sonst `HEAD`. */
export function vorstandRef(argv: string[]): string {
  const i = argv.indexOf('--vorstand')
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : 'HEAD'
}

/** JSON-Datei (Pfad ab Repo-Wurzel) im Vorstand; `undefined`, wenn es sie dort nicht gab. Wirft bei unbekanntem Stand oder kaputtem Inhalt. */
export function leseVorstandJson<T>(pfad: string, ref: string): T | undefined {
  if (!git('ls-tree', ref, '--', pfad).trim()) return undefined
  return JSON.parse(git('show', `${ref}:${pfad}`)) as T
}

/**
 * Schlüssel, die im Vorstand geführt waren (auf der Soll-Liste oder in der Ausgabe) und es jetzt nirgends mehr sind, ohne dass
 * `entfallen` den Wegfall aus der jetzigen Ausgabe erklärt. Sortiert, ohne Doppel.
 */
export function abgaengeOhneGrund(vorher: Iterable<string>, jetzt: ReadonlySet<string>, entfallen: (schluessel: string) => boolean): string[] {
  return [...new Set(vorher)].filter((k) => !jetzt.has(k) && !entfallen(k)).sort()
}
