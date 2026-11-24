import { useState, type ReactNode } from 'react'

/**
 * Im Navigator (Bühne steht in dessen Rahmen) sitzen die Optionen als Seitenleiste links, auf dem Handy einklappbar über dem
 * Raster; als eigene Seite (Werkzeuge, Bilder) bleibt die Leiste oben und der DOM unverändert.
 */
export function Optionen({ eingebettet, children }: { eingebettet: boolean; children: ReactNode }) {
  const [offen, setOffen] = useState(false)
  if (!eingebettet) return <>{children}</>
  return (
    <aside className={offen ? 'optionen offen' : 'optionen'}>
      <button type="button" className="optionen-taste" aria-expanded={offen} onClick={() => setOffen(!offen)}>
        Optionen {offen ? '▴' : '▾'}
      </button>
      <div className="optionen-inhalt">{children}</div>
    </aside>
  )
}

export const istEingebettet = (): boolean => window.parent !== window
