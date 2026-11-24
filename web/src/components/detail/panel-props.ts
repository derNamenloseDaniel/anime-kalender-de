import type { Dataset } from '../../lib/data.ts'

/** Eingaben des Detail-Panels (`DetailPanel.tsx`); der Körper reicht den Teil davon weiter, den er selbst braucht. */
export interface DetailPanelProps {
  data: Dataset
  titleId: number
  /** Über einen Disc-Termin geöffnet: Der Stream/Disc-Umschalter startet auf „Disc". */
  discZuerst?: boolean
  favorites: Set<number>
  hidden: Set<number>
  onToggleFavorite: (id: number) => void
  onToggleHidden: (id: number) => void
  onClose: () => void
  onFilterBy: (kind: 'genre' | 'keyword', value: string) => void
  onOpenTitle: (id: number) => void
}
