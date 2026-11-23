/**
 * Sollfassung des Wächters `daten-zweig-fremd` in `pr-pruefung.yml` (Lehre 229, 23.11.2026), Teil von `tools/pr-kette-pruefen.mjs`.
 * Rot bei `daten/`-Zweig und Autor ≠ Sammler-App: die Kette überspringt `daten/`, sonst prüft und mergt so einen PR nichts (PR 4732).
 * Er steht nicht in `needs` des Sammeljobs (übersprungen zählt dort als rot) und wird als Ganzes gegen die Sollfassung verglichen.
 */
import { isDeepStrictEqual } from 'node:util'

export const WAECHTER_NAME = 'Zweig daten/ nur für Sammler'
export const SOLL_WAECHTER = {
  name: WAECHTER_NAME,
  if: "${{ startsWith(github.head_ref, 'daten/') && github.event.pull_request.user.login != 'anime-kalender-daten[bot]' }}",
  'runs-on': 'ubuntu-latest',
  'timeout-minutes': 2,
  steps: [{ run: 'echo "::error::Zweig daten/ ist Sammlern vorbehalten: Commit auf fix/ oder korrektur/ neu pushen"\nexit 1\n' }],
}

/** Verstöße des Wächter-Jobs: gesucht am Namen, verglichen als Ganzes. */
export function pruefeWaechter(jobs) {
  const treffer = Object.entries(jobs).filter(([, j]) => j.name === WAECHTER_NAME)
  if (treffer.length !== 1) return [`Kein (oder mehr als ein) Job mit dem Namen "${WAECHTER_NAME}" (Wächter für daten/-Zweige fremder Autoren)`]
  const [id, job] = treffer[0]
  return isDeepStrictEqual(job, SOLL_WAECHTER) ? [] : [`Job "${id}" (${WAECHTER_NAME}) weicht von der Sollfassung in tools/pr-kette-waechter.mjs ab`]
}
