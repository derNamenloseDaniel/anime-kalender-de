import type { FranchiseMember } from '@shared/types.ts'
import type { ReihenReiter } from './reihen-reiter-liste.ts'

/**
 * **Staffeln, die der Anbieter als eine führt** (`FranchiseMember.anbieterStaffel`, Konzept Staffelzuschnitt Schritt 3): Netflix zählt Stone Ocean
 * als eine Staffel mit 38 Folgen, wir führen zwei Titel (12 + 26). Der Besucher sieht einen Reiter „6“ statt „6.1“ und „6.2“, im Panel einen
 * Umschalter zwischen den Teilen. Kennungen, Deep-Link und Kalender bleiben die der Titel.
 */

/** Ein Teil der Anbieter-Staffel: der Titel, den er öffnet, und seine Folgen in der Zählung des Anbieters („1–12“). */
export interface AnbieterTeil {
  id: number
  von: number
  bis: number
}

/** Folgenbereich als Beschriftung: „Folge 1–12“, ein einzelner Teil „Folge 13“. */
export function teilBereich(t: Pick<AnbieterTeil, 'von' | 'bis'>): string {
  return t.bis > t.von ? `Folge ${t.von}–${t.bis}` : `Folge ${t.von}`
}

/** Die Teile der Anbieter-Staffel, zu der `id` gehört, nach Teil geordnet; leer, wenn der Titel keiner angehört. */
export function anbieterTeile(reihe: FranchiseMember[], id: number): AnbieterTeil[] {
  const nr = reihe.find((m) => m.id === id)?.anbieterStaffel?.nr
  if (nr === undefined) return []
  return reihe
    .filter((m) => m.anbieterStaffel?.nr === nr)
    .sort((a, b) => a.anbieterStaffel!.teil - b.anbieterStaffel!.teil)
    .map((m) => ({ id: m.id, von: m.anbieterStaffel!.von, bis: m.anbieterStaffel!.bis }))
}

/** Die anderen Teile derselben Anbieter-Staffel (Kennung und Teilnummer), für die Absprünge zu deren aniSearch-Einträgen. */
export function andereTeile(reihe: FranchiseMember[], id: number): { id: number; teil: number }[] {
  const nr = reihe.find((m) => m.id === id)?.anbieterStaffel?.nr
  if (nr === undefined) return []
  return reihe.filter((m) => m.id !== id && m.anbieterStaffel?.nr === nr).map((m) => ({ id: m.id, teil: m.anbieterStaffel!.teil }))
}

/**
 * Fasst die Reiter, die zu derselben Anbieter-Staffel gehören, zu einem zusammen: Beschriftung die Nummer der Reihe („6“), geöffnet wird der Teil,
 * der gerade offen ist, sonst Teil 1; `teile` trägt die Umschalter-Einträge. Ein Reiter allein (die zweite Hälfte ist OVA oder Special und hat
 * keinen Reiter) bleibt, wie er ist: es gibt nichts umzuschalten.
 */
export function fasseAnbieterStaffeln(liste: ReihenReiter[], reihe: FranchiseMember[], offen: number): ReihenReiter[] {
  const nrVon = new Map(reihe.map((m) => [m.id, m.anbieterStaffel?.nr]))
  const gruppen = new Map<number, ReihenReiter[]>()
  for (const r of liste) {
    const nr = nrVon.get(r.id)
    if (nr !== undefined) gruppen.set(nr, [...(gruppen.get(nr) ?? []), r])
  }
  const gefasst = new Set<number>()
  return liste.flatMap((r) => {
    const nr = nrVon.get(r.id)
    const gruppe = nr === undefined ? undefined : gruppen.get(nr)
    if (!gruppe || gruppe.length < 2) return [r]
    if (gefasst.has(nr!)) return []
    gefasst.add(nr!)
    const teile = anbieterTeile(reihe, r.id).filter((t) => gruppe.some((g) => g.id === t.id))
    const gewaehlt = gruppe.find((g) => g.id === offen) ?? gruppe.find((g) => g.id === teile[0]?.id) ?? gruppe[0]!
    return [{ ...gewaehlt, label: String(nr), teile }]
  })
}

/** Die Titel, die schon als Reiter am Kasten stehen und deshalb nicht noch einmal in der Reihenliste: bei einer Anbieter-Staffel alle ihre Teile. */
export function titelAlsReiter(reiter: ReihenReiter[]): Set<number> {
  return new Set(reiter.flatMap((r) => r.teile?.map((t) => t.id) ?? [r.id]))
}

/** Folgenbereich des Titels in der Zählung des Anbieters, nur wenn er nicht bei Folge 1 beginnt (Stone Ocean Teil 2: 13–38); sonst nichts. */
export function anbieterSpanne(reihe: FranchiseMember[], id: number): { von: number; bis: number } | undefined {
  const a = reihe.find((m) => m.id === id)?.anbieterStaffel
  return a && a.von > 1 ? { von: a.von, bis: a.bis } : undefined
}
