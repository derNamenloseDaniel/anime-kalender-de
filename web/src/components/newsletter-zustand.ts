import { useEffect, useState } from 'react'
import type { PlatformId } from '@shared/types.ts'
import { favoritenErgaenzen, type useFavorites } from '../lib/favorites.ts'
import type { Translate } from '../lib/i18n.tsx'
import { pullFavorites, pushFavorites, setSyncToken, subscribe } from '../lib/newsletterSync.ts'
import { WORKER_URL, type FormState } from './static-bausteine.tsx'

type Favoriten = ReturnType<typeof useFavorites>['favorites']

export interface AbgleichZustand {
  welcome: boolean
  syncState: 'idle' | 'sending' | 'ok' | 'error'
  syncMessage: string
  /**
   * Was beim Verbinden vom Server dazukam — für die Rückmeldung mit Abwahl.
   *
   * Die Vereinigung ist die richtige Vorgabe, aber sie holt auch zurück, was
   * jemand absichtlich entfernt hatte. Deshalb wird **nach** dem Verbinden
   * gezeigt, was dazugekommen ist, statt vorher zu fragen: Wer nichts tut, hat
   * den vollständigen Stand, und wer etwas nicht will, hakt es ab (Daniels
   * Entscheidung, 14.08.2026, gegen eine eigene Vergleichsseite).
   */
  uebernommen: number[]
}

/**
 * Zwei Wege führen auf die Seite: die Bestätigungsmail (`welcome=1`) und der
 * Abgleich-Link aus jeder Digest-Mail. Beide bringen den Schlüssel mit.
 *
 * Er wird im Browser hinterlegt — ab da meldet jede Änderung an den
 * Favoriten sich von selbst, ohne dass jemand einen Link anklicken muss.
 */
export function useAbgleichBeimOeffnen(favorites: Favoriten, t: Translate): AbgleichZustand {
  const [uebernommen, setUebernommen] = useState<number[]>([])
  const [syncState, setSyncState] = useState<AbgleichZustand['syncState']>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [welcome, setWelcome] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    const token = params.get('sync')
    setWelcome(params.get('welcome') === '1')
    if (!token || !WORKER_URL) return

    setSyncToken(token)
    setSyncState('sending')

    /**
     * Verbinden heißt **immer vereinigen**, nie überschreiben (Daniels Ablauf, 14.08.2026: ein frischer Browser
     * mit einer Markierung überschrieb per Mail-Link alles auf dem Server). Scheitert das Abholen, wird nichts
     * gesendet — eine Liste ohne Serverstand würde ihn ersetzen (Lehre 242). Danach hält `useFavoritenAbgleich`
     * beide Seiten gleich.
     */
    const arbeit = pullFavorites(token).then((vomServer) => {
      const vereint = [...new Set([...favorites, ...vomServer])].sort((a, b) => a - b)
      // Ergänzen statt umschalten — siehe `favoritenErgaenzen`.
      favoritenErgaenzen(vomServer)
      setUebernommen(vomServer.filter((id) => !favorites.has(id)))
      return pushFavorites(token, vereint, false)
    })

    arbeit
      .then((count) => {
        setSyncState('ok')
        // Die Meldung sagt, was tatsächlich passiert ist: Kamen Titel vom
        // Server dazu, ist das die Nachricht — sonst genügt die Gesamtzahl.
        setSyncMessage(t('news.syncOk', { count }))
      })
      .catch((err: Error) => {
        setSyncState('error')
        setSyncMessage(err.message)
      })
    // Nur beim Öffnen. Spätere Änderungen übernimmt der Abgleich in App.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { welcome, syncState, syncMessage, uebernommen }
}

/** Formularzustand der Anmeldung samt Absenden (Einwilligung vorausgesetzt). */
export function useAnmeldung(favorites: Favoriten, t: Translate) {
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly')
  const [platforms, setPlatforms] = useState<PlatformId[]>([])
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) return
    if (!WORKER_URL) {
      setState('error')
      setMessage(t('news.notConnected'))
      return
    }
    setState('sending')
    try {
      await subscribe({ email, frequency, platforms, favorites: [...favorites] })
      setState('ok')
      setMessage(t('news.ok'))
    } catch (err) {
      setState('error')
      setMessage((err as Error).message)
    }
  }

  return { email, setEmail, frequency, setFrequency, platforms, setPlatforms, consent, setConsent, state, message, submit }
}
