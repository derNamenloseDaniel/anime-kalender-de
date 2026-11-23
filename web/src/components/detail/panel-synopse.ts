import { useEffect, useState } from 'react'
import type { Title } from '@shared/types.ts'
import { loadSynopsis, type Synopsis } from '../../lib/data.ts'

/** Die Inhaltsangabe des Titels samt den Aufklapp-Zuständen, die beim Titelwechsel zurückfallen. */
export function usePanelSynopse(titleId: number, title: Title | undefined) {
  const [synopsis, setSynopsis] = useState<Synopsis | undefined>()
  const [allKeywords, setAllKeywords] = useState(false)
  const [plotOffen, setPlotOffen] = useState(false)

  useEffect(() => {
    let alive = true
    setSynopsis(undefined)
    /* Cartoons (negative Kennung) tragen ihre Beschreibung im Titel — für sie gibt es keine Gruppendatei (16.09.2026). */
    if (titleId < 0) {
      setSynopsis(title?.synopsis ? { de: title.synopsis } : undefined)
    } else {
      loadSynopsis(titleId)
        .then((s) => {
          if (alive) setSynopsis(s)
        })
        .catch(() => {})
    }
    setAllKeywords(false)
    setPlotOffen(false)
    return () => {
      alive = false
    }
  }, [titleId, title?.synopsis])

  return { synopsis, allKeywords, setAllKeywords, plotOffen, setPlotOffen }
}
