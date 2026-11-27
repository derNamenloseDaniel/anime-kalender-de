import { useMemo } from 'react'
import type { FranchiseMember, Title } from '@shared/types.ts'
import type { Dataset } from '../../lib/data.ts'
import { reihenTeileVon, useReihe } from './reihen-daten.ts'
import { kopfNameVon, reihenNameVon, teilNameVon } from './reihen-namen.ts'

/** Reihe, ihre Teile, der eigene Eintrag und die Namen für Kopf und Reihenliste des Panels. */
export function usePanelReihe(title: Title | undefined, data: Dataset) {
  const reihe = useReihe(title)

  const reihenTeile: FranchiseMember[] = useMemo(() => reihenTeileVon(title, reihe, data), [title, reihe, data])

  /**
   * Der eigene Eintrag in der Reihe — er trägt Felder, die `titles.json` nicht
   * führt. `jpStart` etwa steht dort bei keinem einzigen der 2.771 Titel; in
   * `franchises.json` bei jedem, für den AniList mehr weiß als das Jahr.
   */
  const eigenerTeil = useMemo(() => reihenTeile.find((m) => m.id === title?.id), [reihenTeile, title])

  const reihenName = useMemo(() => reihenNameVon(title, reihe, data), [reihe, title, data])
  const kopfName = useMemo(() => kopfNameVon(title, reihe, reihenName), [title, reihe, reihenName])
  const teilName = useMemo(() => teilNameVon(title, kopfName, reihenTeile), [title, kopfName, reihenTeile])

  return { reihe, reihenTeile, eigenerTeil, reihenName, kopfName, teilName }
}
