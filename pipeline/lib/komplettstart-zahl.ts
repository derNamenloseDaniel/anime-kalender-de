import type { ReleaseType, Title } from '../../shared/types.ts'
import { KATALOG_MIN_FOLGEN } from '../../shared/katalog-release.ts'

/**
 * Die Folgenzahl eines Netflix-ONA-Komplettstarts, den die Meldung ohne Zahl nennt (Fool Night, 26.11.2026: 12 Folgen an einem Tag,
 * Netflix-Termin aus anime2you ohne Zahl). AniList führt das Ende am selben Tag wie den Start: alle Folgen erscheinen dort auf einmal.
 * Ohne diese Zahl erkennt `schreibeKatalogRelease` den Termin nicht als Katalog-Release (es verlangt `episodeCount` am Batch).
 */
export function komplettstartZahl(
  art: ReleaseType,
  tag: string,
  treffer: Pick<Title, 'episodes' | 'format' | 'jpEnd'>,
  platform: string | undefined,
): number | undefined {
  if (art !== 'batch' || platform !== 'netflix' || treffer.format !== 'ONA' || treffer.jpEnd !== tag) return undefined
  return treffer.episodes && treffer.episodes >= KATALOG_MIN_FOLGEN ? treffer.episodes : undefined
}
