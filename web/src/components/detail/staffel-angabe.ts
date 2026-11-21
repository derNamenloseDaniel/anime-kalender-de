import { bereicheKurz } from '@shared/dub-grenze.ts'
import { mitStapelFolgen, staffelTeile, type StaffelTeil, type StaffelZeile } from '@shared/staffel-folge.ts'
import type { Release, StreamLink } from '@shared/types.ts'
import type { Translate } from '../../lib/i18n.tsx'

/** „Staffel 1–3 · Staffel 4 Fg. 1“ */
export function staffelText(teile: StaffelTeil[], t: Translate): string {
  return teile
    .map((x) =>
      'staffeln' in x
        ? x.staffeln[0] === x.staffeln[1]
          ? t('detail.teilStaffelEine', { nr: x.staffeln[0] })
          : t('detail.teilStaffel', { von: x.staffeln[0], bis: x.staffeln[1] })
        : t('detail.staffelFolgen', { s: x.staffel, bereiche: bereicheKurz(x.folgen.map(([from, to]) => ({ from, to }))) }),
    )
    .join(' · ')
}

/**
 * Die Folgenangabe einer Anbieterzeile in Staffeln, wo der Titel deutsche Staffelgrenzen hat (Horizonte: RTL+ „Staffel 1–3 · Staffel 4 Fg. 1“
 * statt „Fg. 1–136“). Zählt die belegten Bereiche plus erschienene Stapel-Termine des Wegs. Joyn (rollendes Fenster) und vom Wochenplan
 * ergänzte Folgen (≈) bleiben bei der durchgehenden Angabe.
 */
export function staffelAngabe(staffeln: StaffelZeile[] | undefined, s: Pick<StreamLink, 'platform' | 'kanal' | 'dubRanges'> & { ergaenzteFolgen?: number[] }, releases: Release[], today: string, t: Translate): string | undefined {
  if (!staffeln?.length || s.platform === 'joyn' || s.ergaenzteFolgen?.length) return undefined
  const deutsch = (s.dubRanges ?? []).filter((r) => r.dub).map((r): [number, number] => [r.from, r.to])
  const eigene = releases.filter((r) => r.platform === s.platform && (r.kanal ?? '').toLowerCase() === (s.kanal ?? '').toLowerCase())
  const teile = staffelTeile(staffeln, mitStapelFolgen(deutsch, eigene, today))
  return teile?.length ? staffelText(teile, t) : undefined
}
