import { type ReactNode } from 'react'
import { MitFachwoertern } from '../fachwort.tsx'
import { mitHinweis } from '../ui.tsx'
import { type Release, type Title, PLATFORMS } from '@shared/types.ts'
import { istAusgeblieben } from '@shared/logic.ts'
import { VermerkAuskunft } from './vermerk.tsx'
import { Umschalter } from './umschalter.tsx'
import { type Antwort } from './antwort-typ.ts'
import { KastenSchnitt, KastenFakten } from './antwort-kasten-teile.tsx'

type Uebersetzer = (k: string, v?: Record<string, string | number>) => string

/** Was der Kopfblock zeigt (Teile aus `antwortKopf`, Umschalter, Hinweise). */
export interface KopfblockProps {
  antwort: Antwort
  title: Title
  today: string
  T: Uebersetzer
  haupt: ReactNode
  gedaempft: boolean
  neben: string
  nebenTitel: string | undefined
  fakten: React.ComponentProps<typeof KastenFakten>['fakten']
  anteil: number | undefined
  zaehl: ReactNode
  umschalter: { aktivDisc: boolean; streamLeer: boolean; discLeer: boolean; onWahl: (disc: boolean) => void }
  angebotSeit?: string
  hinweis?: ReactNode
  notiz?: string
  nachleger?: string[]
  schnitt?: Release['schnitt']
}

/** Überschrift mit Umschalter, Nebenzeile, Fakten, Zähler und Hinweise (aus `AntwortKasten` herausgelöst). */
export function KastenKopfblock(p: KopfblockProps) {
  const { antwort, title, today, T, haupt, gedaempft, neben, nebenTitel, fakten, anteil, zaehl, umschalter, angebotSeit, hinweis, notiz, nachleger, schnitt } = p
  return (
      <div className="flex flex-col">
      <div className="flex items-start gap-2">
      <p
        className={[
          'text-t2 font-bold',
          gedaempft ? 'text-ak-leise' : 'text-slate-900 dark:text-white',
        ].join(' ')}
      >
        {haupt}
      </p>
      {/*
        **Überschrift und Umschalter teilen sich eine Zeile**: „headline auf
        selbe zeile wie den toggle, trennstrich genau darunter, dann die pills. box müsste also um
        ~2 zeilen kleiner werden." Der Umschalter selbst steht in `Umschalter`.
      */}
      <Umschalter
        aktivDisc={umschalter.aktivDisc}
        streamLeer={umschalter.streamLeer}
        discLeer={umschalter.discLeer}
        onWahl={umschalter.onWahl}
        T={T}
      />
      </div>
      {neben && (
        <p className="mt-0.5 text-t4 text-ak-leise">
          {mitHinweis(nebenTitel, 'unten', <MitFachwoertern text={neben} />)}
        </p>
      )}

      {nachleger?.map((z) => <p key={z} className="mt-1 text-t4 text-ak-leise">{z}</p>)}
      <KastenFakten fakten={fakten} anteil={anteil} />

      {zaehl && <p className="mt-1 text-t4 text-ak-leise">{zaehl}</p>}
      {angebotSeit && <p className="mt-1 text-t4 text-ak-leise">{angebotSeit}</p>}
      {hinweis}
      {antwort.art === 'laeuft' && antwort.vermerk && (
        <VermerkAuskunft
          vermerk={antwort.vermerk}
          ausgeblieben={istAusgeblieben(antwort.haupt)}
          episode={antwort.haupt.episode}
          anbieter={PLATFORMS[antwort.haupt.platform]?.name ?? antwort.haupt.platform}
          anbieterUrl={(title.streams ?? []).find((s) => s.platform === antwort.haupt.platform)?.url}
          today={today}
          T={T}
        />
      )}
      {/* Die Erklärung zum Termin, leise: Sie erklärt, sie warnt nicht (Signalfarben nur für Signale). */}
      {notiz && (
        <p className="mt-1.5 text-t4 text-slate-600 dark:text-slate-300">
          <MitFachwoertern text={notiz} />
        </p>
      )}
      <KastenSchnitt schnitt={schnitt} />
      </div>
  )
}
