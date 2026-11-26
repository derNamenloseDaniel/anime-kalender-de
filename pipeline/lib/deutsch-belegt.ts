import { SPRACH_NOTIZEN } from './meldungen.ts'
import type { Release, StreamLink, Title } from '../../shared/types.ts'

/** Die letzte Teilzeichenkette einer Adresse (Titelkennung): macht `/dp/B…` und `/gp/video/detail/B…` vergleichbar. */
export const kennung = (url: string): string => url.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? ''

/** Ein Weg desselben Anbieters mit belegtem Deutsch (kein abgeleiteter) an der Adresse des Termins; ohne Adresse am Termin zählt jeder Weg des Anbieters. */
export function belegterWeg(r: Release, title: Title): StreamLink | undefined {
  return title.streams.find((s) => s.platform === r.platform && s.dub === true && !s.dubAbgeleitet && (!r.platformUrl || kennung(s.url) === kennung(r.platformUrl)))
}

/** Eine Netflix-Eigenproduktion mit deutscher Synchro-Marke am Titel (aniSearch): Netflix liefert sie mit deutschem Ton. */
export const netflixOriginalMitSynchro = (r: Release, title: Title): boolean => r.platform === 'netflix' && r.netflixOriginal === true && title.deErstausgabe?.synchro === true

/** Ist Deutsch für diesen Termin belegt: ein Weg mit `dub: true` an seiner Adresse oder eine Netflix-Eigenproduktion mit Synchro? Discs gehören nicht dazu. */
export const istDeutschBelegt = (r: Release, title: Title | undefined): boolean =>
  !!title && r.releaseType !== 'disc' && (!!belegterWeg(r, title) || netflixOriginalMitSynchro(r, title))

/** Der Hinweis stammt aus `SPRACH_NOTIZEN`: „ob mit deutscher Synchro …“, von der Meldung gesetzt. */
export const istSprachNotiz = (r: Release): boolean => r.hinweis !== undefined && SPRACH_NOTIZEN.includes(r.hinweis)

/** Wächter: Termine von Hand (automatische prüft `autoReleaseWidersprueche` gegen ihre Quelle), die bei belegtem Deutsch noch „Synchro offen“ oder den Unsicherheits-Hinweis tragen (26.11.2026: Call of the Night). */
export function deutschBelegtTrotzOffen(releases: Release[], titles: Map<number, Title>): string[] {
  return releases
    .filter((r) => !r.automatisch && r.sprache !== 'omu' && istDeutschBelegt(r, titles.get(r.titleId)) && (r.sprache === 'offen' || istSprachNotiz(r)))
    .map((r) => `"${r.slug}": Deutsch ist belegt, der Termin trägt trotzdem „Synchro offen“ oder den Hinweis „ob mit deutscher Synchro …“`)
}
