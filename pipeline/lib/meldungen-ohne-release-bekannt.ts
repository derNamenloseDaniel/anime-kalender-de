/**
 * Stand 27.11.2026 (Shaman King und Steel Ball Run haben Releases): die Meldungen mit Termin und deutschem Ton, die der Bau noch keinem Release zuordnet (Artikel | Titel). Die Liste
 * darf nur schrumpfen: ein Eintrag, den `check-meldungen-ohne-release-bestand.ts` als erledigt meldet, wird gestrichen, nie ein neuer angehängt.
 * Danganronpa 3: AniList führt Future, Despair und Hope Arc als drei Titel, Prime eine Staffel mit 24 Folgen; die Zeile hat keinen Einzeltitel
 * (Handbeleg `data/dub-confirmed.yaml`, Future Arc, Note zur Aufteilung) und stand schon vor diesem PR auf `nicht-zugeordnet.json` von main.
 */
export const BEKANNT_OHNE_RELEASE: readonly string[] = [
  'https://www.anime2you.de/news/1035676/aniverse-august-2026-neuzugaenge/ | Danganronpa 3 – Future & Despair',
]
