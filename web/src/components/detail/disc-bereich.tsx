import { useMemo, useState, type ReactNode } from 'react'
import type { DiscAusgabe, Release, Title } from '@shared/types.ts'
import { anzeigeName } from '@shared/titles.ts'
import { useLang, type TranslationKey } from '../../lib/i18n.tsx'
import { discAusgabenVon } from './disc-ausgaben.ts'
import { DiscPillen } from './disc-pillen.tsx'
import { gruppenVon, jahre, startOffen, variantenVon, type Art, type Variante } from './disc-varianten.ts'

/*
  **Der Disc-Bereich im Detail-Panel** (Daniel, 26.11.2026, Mockup `disc-bereich-3` A): jede Variante eine Pille mit Direktlink,
  nach Art gruppiert. Eine Gruppe mit einem Eintrag steht immer offen, eine einzige Gruppe hat keinen Kopf; zugeklappt starten nur
  Volumes und Filme mit mehreren Einträgen neben Gesamtausgaben oder Boxen (Zahl und Jahre am Kopf).
*/

/** Bis hierhin zeigt eine Gruppe alle Pillen; darüber sechs und einen Knopf für den Rest. */
const GRENZE = 6

interface GruppeProps {
  art: Art
  liste: Variante[]
  /** Bei nur einer Gruppe sagt der Kopf nichts, was die Pillen nicht zeigen. */
  kopf: boolean
  offen: boolean
  today: string
}

function Gruppe({ art, liste, kopf, offen: start, today }: GruppeProps) {
  const { t } = useLang()
  const [offen, setOffen] = useState(start)
  const [alle, setAlle] = useState(false)
  const klappbar = kopf && liste.length > 1
  const zeigt = offen || !klappbar
  const sichtbar = alle || liste.length <= GRENZE + 2 ? liste : liste.slice(0, GRENZE)
  const spanne = jahre(liste)
  const titel = (
    <span className="text-t4 font-bold">
      {t(`disc.art.${art}` as TranslationKey)}
      {liste.length > 1 && (
        <span className="font-normal text-ak-leise">
          {' '}
          · {liste.length}
          {spanne && ` · ${spanne}`}
        </span>
      )}
    </span>
  )
  return (
    <section className="flex flex-col gap-1.5" data-disc-gruppe={art}>
      {klappbar && (
        <button type="button" aria-expanded={offen} onClick={() => setOffen((o) => !o)} className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-1 text-left hover:bg-ak-flaeche-2">
          {titel}
          <span aria-hidden="true" className="text-ak-akzent-text">
            {offen ? '▴' : '▾'}
          </span>
        </button>
      )}
      {kopf && !klappbar && <div className="px-1 pt-1">{titel}</div>}
      {zeigt && <DiscPillen liste={sichtbar} today={today} />}
      {zeigt && sichtbar.length < liste.length && (
        <button type="button" onClick={() => setAlle(true)} className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-3 text-t4 font-semibold text-ak-akzent-text hover:bg-ak-flaeche-2">
          {t('disc.alleZeigen', { n: liste.length })} <span aria-hidden="true">▾</span>
        </button>
      )}
    </section>
  )
}

export interface DiscBereichProps {
  title: Title
  today: string
  discAusgaben: DiscAusgabe[]
  discReleases: Release[]
  /** Die übrigen Kaufwege der Seite (Apple TV, Google Play …) als fertige Pillen. */
  kaufwege: ReactNode[]
}

export function DiscBereich({ title, today, discAusgaben, discReleases, kaufwege }: DiscBereichProps) {
  const { t } = useLang()
  const alle = useMemo(() => variantenVon(discAusgabenVon(discAusgaben, discReleases, title), anzeigeName(title)), [discAusgaben, discReleases, title])
  const gruppen = gruppenVon(alle)
  /* Die Zahl erst ab zwei Varianten: „1 Variante“ über einer Pille sagt nichts. */
  const kopf = [alle.length > 1 ? t('disc.varianten', { n: alle.length }) : '', discReleases.map((r) => r.publisher).find(Boolean) ?? ''].filter(Boolean).join(' · ')
  return (
    <div className="flex w-full flex-col gap-2">
      {kopf && <div className="text-t5 font-bold uppercase tracking-[.08em] text-ak-leise">{kopf}</div>}
      {gruppen.map((g) => (
        /* Die aniSearch-Ausgaben kommen nach den Terminen; mit dem Schlüssel greift der Startzustand auch dann. */
        <Gruppe key={`${g.art}-${startOffen(alle, g.art)}`} art={g.art} liste={g.liste} kopf={gruppen.length > 1} offen={startOffen(alle, g.art)} today={today} />
      ))}
      {kaufwege.length > 0 && <div className="flex flex-wrap items-start gap-x-2 gap-y-4 pt-1">{kaufwege}</div>}
    </div>
  )
}
