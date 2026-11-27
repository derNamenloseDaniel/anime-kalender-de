/**
 * **Ein Hinweis „Synchro angekündigt, Termin offen“ gilt nur, solange es keine deutsche Folge gibt** (Daniel, 26.11.2026, Black Clover Staffel 2:
 * der Hinweis stand weiter da, obwohl `black-clover-s2-crunchyroll-synchro` seit 07.11. lief). Gesucht wird ein anderes Release desselben Titels und
 * Anbieters ohne `sprache`, nicht widerlegt, mit erstem Tag bis heute. Der Hinweis selbst wird nur bei Ankündigungs-Wortlaut gestrichen.
 */
import type { Release } from '../../shared/types.ts'

const ANKUENDIGUNGS_WORTLAUT = /synchro[^.]*(angek[uü]ndigt|termin[^.]*offen)|keine deutsche synchro|mit untertiteln/i

const istDeutscheFolge = (s: Release, heute: string): boolean =>
  !s.sprache && !s.widerlegt && (s.schedule?.firstEpisodeDate ?? '9999') <= heute

export function veralteteSynchroHinweise(releases: Release[], heute: string): Release[] {
  return releases.filter(
    (r) =>
      r.hinweis &&
      ANKUENDIGUNGS_WORTLAUT.test(r.hinweis) &&
      releases.some((s) => s !== r && s.titleId === r.titleId && s.platform === r.platform && istDeutscheFolge(s, heute)),
  )
}
