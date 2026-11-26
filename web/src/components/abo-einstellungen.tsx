import { useEffect, useState } from 'react'
import type { DataMeta, PlatformId } from '@shared/types.ts'
import { useLang, type Translate } from '../lib/i18n.tsx'
import {
  getSyncToken,
  ladeEinstellungen,
  speichereEinstellungen,
  type Einstellungen
} from '../lib/newsletterSync.ts'
import { SectionTitle } from './ui.tsx'
import { AboBeenden, type AbmeldeState } from './AboBeenden.tsx'
import { Card, PlatformToggleList } from './static-bausteine.tsx'

type Werte = { frequency: 'daily' | 'weekly'; platforms: string[]; franchiseHinweis?: boolean }
type Sichern = (werte: Werte) => void

interface AboEinstellungenProps {
  meta: DataMeta
  onWechseln: () => void
  abmeldeState: AbmeldeState
  setAbmeldeState: (s: AbmeldeState) => void
}

/** Lädt den Abo-Stand und sichert Änderungen; Zustände und Reihenfolge wie vor der Zerlegung. */
function useAboStand() {
  const [stand, setStand] = useState<Einstellungen | undefined>()
  const [fehler, setFehler] = useState('')
  const [speichert, setSpeichert] = useState<'idle' | 'laeuft' | 'ok'>('idle')
  /**
   * Eigener Zustand statt `!stand`.
   *
   * „Wird geladen" hing vorher allein daran, dass noch nichts angekommen war —
   * und blieb deshalb nach einem Fehler für immer stehen. Am 18.08.2026 stand so
   * eine rote Fehlermeldung direkt über einem Ladehinweis, der nie endete.
   */
  const [laedt, setLaedt] = useState(true)

  useEffect(() => {
    const token = getSyncToken()
    if (!token) {
      setLaedt(false)
      return
    }
    ladeEinstellungen(token)
      .then(setStand)
      .catch((e: Error) => setFehler(e.message))
      .finally(() => setLaedt(false))
  }, [])

  function sichern(werte: Werte) {
    const token = getSyncToken()
    if (!token) return
    setStand((s) => (s ? { ...s, ...werte } : s))
    setSpeichert('laeuft')
    speichereEinstellungen(token, werte)
      .then(() => setSpeichert('ok'))
      .catch((e: Error) => {
        setFehler(e.message)
        setSpeichert('idle')
      })
  }

  return { stand, fehler, speichert, laedt, sichern }
}

function HaeufigkeitWahl({ stand, sichern, t }: { stand: Einstellungen; sichern: Sichern; t: Translate }) {
  return (
    <div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('news.frequency')}
      </span>
      <div className="mt-1.5 flex gap-2">
        {(['weekly', 'daily'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => sichern({ frequency: f, platforms: stand.platforms })}
            className={[
              'cursor-pointer rounded-lg border px-3 py-2 text-sm transition',
              stand.frequency === f
                ? 'border-sky-500 bg-sky-500/10 font-medium text-slate-900 dark:text-white'
                : 'border-slate-300 text-slate-600 hover:border-ak-leise dark:border-white/15 dark:text-slate-300',
            ].join(' ')}
          >
            {t(f === 'weekly' ? 'news.weekly' : 'news.daily')}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * **Neues aus gemerkten Reihen.**
 *
 * Daniel am 28.08.2026: „ich will informiert werden weil ich es sonst
 * evtl verpasse." Wer die letzte Staffel gemerkt hat, erfährt sonst nie
 * von der nächsten — sie ist ein eigener Titel, und den kann noch
 * niemand gemerkt haben.
 */
function FranchiseHinweisWahl({ stand, sichern, t }: { stand: Einstellungen; sichern: Sichern; t: Translate }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={stand.franchiseHinweis !== false}
          onChange={(e) =>
            sichern({
              frequency: stand.frequency,
              platforms: stand.platforms,
              franchiseHinweis: e.target.checked,
            })
          }
          className="mt-0.5 h-4 w-4 cursor-pointer accent-sky-500"
        />
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {t('news.franchiseHint')}
          <span className="mt-0.5 block text-xs text-ak-leise">
            {t('news.franchiseHintNote')}
          </span>
        </span>
      </label>
    </div>
  )
}

/** Der Franchise-Hinweis sitzt bewusst im selben Block wie die Plattformen (Aufbau unverändert). */
function PlattformWahl({ meta, stand, sichern, t }: { meta: DataMeta; stand: Einstellungen; sichern: Sichern; t: Translate }) {
  return (
    <div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {t('news.platforms')}
      </span>
      <div className="mt-1.5">
        <PlatformToggleList
          platforms={meta.platforms}
          selected={stand.platforms.length ? (stand.platforms as PlatformId[]) : 'all'}
          onToggle={(p) => {
            const naechste = stand.platforms.includes(p)
              ? stand.platforms.filter((x) => x !== p)
              : [...stand.platforms, p]
            sichern({ frequency: stand.frequency, platforms: naechste })
          }}
          allLabel={t('news.allPlatforms')}
          onAll={() => sichern({ frequency: stand.frequency, platforms: [] })}
        />
      </div>
      <FranchiseHinweisWahl stand={stand} sichern={sichern} t={t} />
    </div>
  )
}

/**
 * Was ein verbundener Browser sieht: seinen Stand, nicht das Anmeldeformular.
 *
 * Rhythmus und Plattformen lassen sich hier ändern, ohne sich neu anzumelden.
 * Die Adresse bleibt außen vor — sie zu wechseln heißt, ein neues Abo mit neuer
 * Bestätigung anzulegen, und dafür gibt es das Formular.
 */
export function AboEinstellungen({ meta, onWechseln, abmeldeState, setAbmeldeState }: AboEinstellungenProps) {
  const { t } = useLang()
  const { stand, fehler, speichert, laedt, sichern } = useAboStand()

  return (
    <Card>
      <SectionTitle>{t('news.yourSubscription')}</SectionTitle>
      {fehler && <p className="mb-2 text-sm text-ak-fehler-text">{fehler}</p>}
      {laedt ? (
        <p className="text-sm text-slate-400">{t('news.loadingPrefs')}</p>
      ) : !stand ? null : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('news.connectedAs', { mail: stand.email })}
          </p>

          <HaeufigkeitWahl stand={stand} sichern={sichern} t={t} />
          <PlattformWahl meta={meta} stand={stand} sichern={sichern} t={t} />

          {speichert === 'ok' && <p className="text-sm text-ak-gut-text">{t('news.prefsSaved')}</p>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={onWechseln}
              className="cursor-pointer text-sm text-sky-700 dark:text-sky-300 underline hover:text-ak-text"
            >
              {t('news.changeAddress')}
            </button>
          </div>
          <div className="border-t border-slate-200 pt-3 dark:border-white/10">
            <AboBeenden state={abmeldeState} setState={setAbmeldeState} />
          </div>
        </div>
      )}
    </Card>
  )
}
