import type { Release, Title } from '../../shared/types.ts'
import type { TvSendung } from '../fetch-tv-programm.ts'
import { releasesAusTvProgramm, type WikiListen } from './tv-termine.ts'

/**
 * Nur die Sichtungen ab dem Start des Handtermins auswerten: Frühere Sendungen desselben Titels (One Piece: Wa-No-Kuni-Folgen
 * im September, nicht in der Folgenliste des Bereichs) hielten sonst die Nummern der Wiederholung ab Folge 780 zurück (26.11.2026).
 */
function schattenAbStart(hand: Release, start: string, sendungen: TvSendung[], titles: Map<number, Title>, wiki: WikiListen): Release | undefined {
  const sender = (hand.sender ?? '').toLowerCase()
  const ab = sendungen.filter((s) => hand.titleId === s.titleId && s.sender.toLowerCase() === sender && s.start.slice(0, 10) >= start)
  return releasesAusTvProgramm(ab, titles, [], wiki).find((r) => r.folgenBelegt)
}

/**
 * **Ein von Hand gepflegter TV-Termin bekommt die Tage seiner gesichteten Folgen** (08.11.2026, Yaiba).
 *
 * Der Handtermin ersetzt die Sichtungen aus tv.de ab seinem Start, also trug er weder `observed` noch `folgenBelegt` —
 * und die Joyn-Pille (`13-1-anreichern`, Abruffenster) blieb ohne Folgen. Hier läuft dieselbe Auswertung, die sonst den
 * Auto-Termin baut (Nummern nur über eine Folgenliste, die jede Sichtung findet), ohne Handtermine als Sperre, und
 * übernimmt deren Tage in den Handtermin. Ein Handtermin mit eigenen Beobachtungen bleibt, wie er ist.
 * Findet der Gesamtbestand keinen Treffer, zählen nur die Sichtungen ab dem Start des Handtermins (`schattenAbStart`).
 */
export function belegeHandTermine(releases: Release[], sendungen: TvSendung[], titles: Map<number, Title>, wiki: WikiListen): number {
  const schatten = releasesAusTvProgramm(sendungen, titles, [], wiki).filter((r) => r.folgenBelegt)
  let belegt = 0
  for (const hand of releases) {
    if (hand.platform !== 'tv' || hand.slug.startsWith('auto-') || Object.keys(hand.schedule.observed ?? {}).length) continue
    const start = hand.schedule.firstEpisodeDate
    const sender = (hand.sender ?? '').toLowerCase()
    const gleich =
      schatten.find((s) => s.titleId === hand.titleId && (s.sender ?? '').toLowerCase() === sender) ??
      (start ? schattenAbStart(hand, start, sendungen, titles, wiki) : undefined)
    if (!start || !gleich) continue
    const erste = hand.schedule.firstEpisodeNumber ?? 1
    const letzte = erste + (hand.schedule.episodeCount ?? 0) - 1
    const tage = Object.entries(gleich.schedule.observed ?? {}).filter(([nr, tag]) => tag >= start && Number(nr) >= erste && Number(nr) <= letzte)
    if (!tage.length) continue
    hand.schedule.observed = Object.fromEntries(tage)
    hand.folgenBelegt = true
    belegt++
  }
  return belegt
}
