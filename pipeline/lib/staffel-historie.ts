/**
 * Eine Staffel, die der Bau aus einem Sammeltitel schneidet (`staffelTitel`), erbt dessen Gedächtnis: Ohne Eintrag unter der neuen Kennung
 * hielte sie jeder Lauf für neu (Meldung „erstmals mit deutscher Synchro“ und „Im Angebot seit“ mit dem Tag der Aktivierung statt dem echten).
 * Die Basis-Staffel behält die Kennung des Sammeltitels und braucht nichts.
 */
import type { Title } from '../../shared/types.ts'

/** Der Sammeltitel einer abgeleiteten Staffel; sonst undefined. */
const sammelVon = (t: Pick<Title, 'id' | 'staffelTitel'>): number | undefined => (t.staffelTitel && t.staffelTitel.sammel !== t.id ? t.staffelTitel.sammel : undefined)

/** `data/synchro-historie.json` (`seit`): der Tag des Sammeltitels, solange die Staffel keinen eigenen hat. */
export function geerbterSeitTag(seit: Record<string, string>, t: Pick<Title, 'id' | 'staffelTitel'>): string | undefined {
  const sammel = sammelVon(t)
  return sammel === undefined ? undefined : seit[sammel]
}

/** `data/news-historie.json` (`anbieter`, Schlüssel `<Kennung>:<Anbieter>`): der Tag des Sammeltitels für denselben Anbieter. */
export function geerbterAnbieterTag(anbieter: Record<string, string>, t: Pick<Title, 'id' | 'staffelTitel'>, platform: string): string | undefined {
  const sammel = sammelVon(t)
  return sammel === undefined ? undefined : anbieter[`${sammel}:${platform}`]
}
