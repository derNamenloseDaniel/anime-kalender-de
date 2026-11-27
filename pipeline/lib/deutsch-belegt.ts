import { quellenName, SPRACH_NOTIZEN } from './meldungen.ts'
import type { DubCheck } from './dub-confirmed.ts'
import type { Quelle, Release, StreamLink, Title } from '../../shared/types.ts'

/** Die letzte Teilzeichenkette einer Adresse (Titelkennung): macht `/dp/B…` und `/gp/video/detail/B…` vergleichbar. */
export const kennung = (url: string | undefined): string => (url ?? '').replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? ''

/** Ein Weg desselben Anbieters mit belegtem Deutsch (kein abgeleiteter) an der Adresse des Termins; ohne Adresse am Termin zählt jeder Weg des Anbieters. */
export function belegterWeg(r: Release, title: Title): StreamLink | undefined {
  return title.streams.find((s) => s.platform === r.platform && s.dub === true && !s.dubAbgeleitet && (!r.platformUrl || kennung(s.url) === kennung(r.platformUrl)))
}

/** Beginn des `sagt`-Texts der Quelle, die einen Handbeleg am Termin sichtbar macht (`quelleAusHandbeleg`). */
export const HANDBELEG_SAGT = 'Deutscher Ton am Anbieter gemessen'

/** Ein Handbeleg (`data/dub-confirmed.yaml`, keine abgeleitete Spur) für Titel und Anbieter des Termins; ohne Adresse am Termin oder am Beleg genügt der Anbieter. */
export function handbelegFuer(r: Release, belege: DubCheck[]): DubCheck | undefined {
  return belege.find(
    (b) => b.anilistId === r.titleId && b.platform === r.platform && b.dub === true && b.available !== false && b.juengstesUrteil !== 'nein' && !!(b.url || r.platformUrl) && (!r.platformUrl || !b.url || kennung(b.url) === kennung(r.platformUrl)),
  )
}

/** Die Quelle am Termin: Anbieter-Adresse, was gemessen wurde, Tag der Messung. */
export function quelleAusHandbeleg(r: Release, b: DubCheck): Quelle {
  const url = b.url ?? r.platformUrl ?? ''
  return { url, name: quellenName(url), gesehenAm: b.checkedAt, stand: 'aktuell', sagt: `${HANDBELEG_SAGT} (${b.checkedAt})` }
}

/** Trägt der Termin schon die Quelle eines Handbelegs? */
export const hatHandbelegQuelle = (r: Release): boolean => !!r.quellen?.some((q) => q.sagt?.startsWith(HANDBELEG_SAGT))

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
