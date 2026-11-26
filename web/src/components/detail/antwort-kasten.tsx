import { type ReleaseEvent } from '@shared/types.ts'
import { istAusgeblieben } from '@shared/logic.ts'
import { KastenPillen, KastenWegeHinweis } from './antwort-kasten-teile.tsx'
import { type AntwortKastenProps } from './antwort-kasten-props.ts'
import { KastenKopfblock } from './antwort-kasten-kopfblock.tsx'
import { kastenKlassen, kastenKopfVon, useKastenZustand } from './antwort-kasten-zustand.tsx'

/**
 * Die Nummer der letzten ausgebliebenen Folge in einer ununterbrochenen Reihe ab `erste`.
 *
 * Fällt eine Woche aus und die nächste auch, stünde sonst „Folge 8 ist nicht
 * erschienen" über einem Kasten, in dem auch Folge 9 fehlt.
 */
export function ausgebliebenBis(erste: ReleaseEvent, kuenftig: ReleaseEvent[]): number | undefined {
  let bis = erste.episode
  if (bis == null) return undefined
  for (const e of kuenftig) {
    if (e === erste || e.episode == null || e.episode <= bis) continue
    if (e.episode !== bis + 1 || !istAusgeblieben(e)) break
    bis = e.episode
  }
  return bis > erste.episode! ? bis : undefined
}

export function AntwortKasten({
  antwort,
  title,
  t,
  today,
  stream = [],
  disc = [],
  wegeHinweis,
  notiz, folgen,
  schnitt,
  angebotSeit,
  hinweis,
  pillenGruppen = new Map(),
  terminPillen = [],
  discZuerst = false,
  ohneSprachbeleg,
  releases = [],
}: AntwortKastenProps) {
  const z = useKastenZustand({ antwort, title, t, stream, disc, pillenGruppen, terminPillen, discZuerst })
  const { neben, gedaempft, haupt, nebenTitel, fakten, anteil, zaehl } = kastenKopfVon({ antwort, title, today, T: z.T, releases, ohneSprachbeleg, folgenZahl: z.folgenZahl, staffeln: z.staffeln })

  return (
    /* Höhe und Farbe der Hülle: `kastenKlassen` (Daniel, 03.09.2026: Höhe des Kastens soll nicht springen). */
    <section className={kastenKlassen({ antwort, title, neben, gedaempft })}>
      {/* Der Kopf steht oben; der freie Platz sammelt sich über den Pillen, wo er nicht auffällt. */}
      <KastenKopfblock
        antwort={antwort}
        title={title}
        today={today}
        T={z.T}
        haupt={haupt}
        gedaempft={gedaempft}
        neben={neben}
        nebenTitel={nebenTitel}
        fakten={fakten}
        anteil={anteil}
        zaehl={zaehl}
        umschalter={{ aktivDisc: z.aktivDisc, streamLeer: z.streamPillen.length === 0, discLeer: disc.length === 0, onWahl: z.setZeigeDisc }}
        angebotSeit={angebotSeit}
        hinweis={hinweis}
        notiz={notiz}
        schnitt={schnitt}
      />
      <KastenWegeHinweis pillen={z.pillen} wegeHinweis={wegeHinweis} antwort={antwort} />
      <KastenPillen
        pillen={z.pillen}
        mitBereichen={z.mitBereichen}
        gruppeVon={z.gruppeVon}
        kostenlosKopf={z.kostenlosKopf}
        T={z.T}
      />
      {folgen}
    </section>
  )
}
