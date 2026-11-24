import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Wohin die Optionen (Leiste und Beschreibung) kommen:
 * - `anker`: Der Navigator trägt in seiner Seitenleiste ein Element `#optionen-ziel` (gleicher Ursprung); die Optionen erscheinen dort,
 *   es gibt nur eine Seitenleiste. Zustand und Hash bleiben in der Bühne.
 * - `streifen`: Die Bühne steht in einem Rahmen ohne Anker (oder ohne Zugriff): Seitenstreifen in der Bühne selbst.
 * - `oben`: eigene Seite (Werkzeuge, Bilder), Leiste oben, DOM unverändert.
 */
export type Ort = { art: 'oben' } | { art: 'streifen' } | { art: 'anker'; ziel: HTMLElement }

export function optionenOrt(fenster: { parent: unknown }): Ort {
  if (fenster.parent === fenster) return { art: 'oben' }
  try {
    const ziel = (fenster.parent as Window).document.getElementById('optionen-ziel')
    if (ziel) return { art: 'anker', ziel }
  } catch {
    // fremder Ursprung: kein Zugriff auf den Rahmen
  }
  return { art: 'streifen' }
}

/** Die Stile der Bühne leben im Schattenbaum des Ankers, damit sie dem Navigator nichts überschreiben (und umgekehrt). */
function InAnker({ ziel, stil: stilText, children }: { ziel: HTMLElement; stil: string; children: ReactNode }) {
  const [innen, setInnen] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const schatten = ziel.shadowRoot ?? ziel.attachShadow({ mode: 'open' })
    const stil = ziel.ownerDocument.createElement('style')
    stil.textContent = stilText
    const wurzel = ziel.ownerDocument.createElement('div')
    wurzel.className = 'optionen-schatten'
    schatten.replaceChildren(stil, wurzel)
    ziel.hidden = false
    setInnen(wurzel)
    const raeume = () => {
      schatten.replaceChildren()
      ziel.hidden = true
    }
    window.addEventListener('pagehide', raeume)
    return () => {
      window.removeEventListener('pagehide', raeume)
      raeume()
    }
  }, [ziel, stilText])
  return innen ? createPortal(children, innen) : null
}

/** `stil`: Text von rahmen.css (`?inline`, im Test leer), den der Anker im Schattenbaum braucht. */
export function Optionen({ ort, stil = '', children }: { ort: Ort; stil?: string; children: ReactNode }) {
  const [offen, setOffen] = useState(false)
  if (ort.art === 'oben') return <>{children}</>
  if (ort.art === 'anker') return <InAnker ziel={ort.ziel} stil={stil}>{children}</InAnker>
  return (
    <aside className={offen ? 'optionen offen' : 'optionen'}>
      <button type="button" className="optionen-taste" aria-expanded={offen} onClick={() => setOffen(!offen)}>
        Optionen {offen ? '▴' : '▾'}
      </button>
      <div className="optionen-inhalt">{children}</div>
    </aside>
  )
}
