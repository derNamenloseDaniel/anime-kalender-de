import type { NewsEintrag, PlatformId } from './types.ts'
import { anbieterName } from './types.ts'

/** „Jetzt auch bei X" aus der Meldungsliste: je Titel und weiterem Anbieter ein Eintrag (Push und Mail im Worker, Vorberechnung im Bau). */
export function weitereAusNews(eintraege: NewsEintrag[]): { id: number; name: string; anbieter: string; am: string }[] {
  return eintraege.flatMap((e) =>
    e.meldungen
      .filter((m) => m.art === 'neu' && m.weiterer && m.platform)
      .map((m) => ({
        id: m.teilId ?? e.titelId,
        name: m.teil ? `${e.titel} – ${m.teil}` : e.titel,
        anbieter: anbieterName(m.platform as PlatformId),
        am: e.am.slice(0, 10),
      })),
  )
}
