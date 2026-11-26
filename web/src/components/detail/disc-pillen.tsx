import { useLang, type TranslationKey } from '../../lib/i18n.tsx'
import { DiscZeichen } from '../ui.tsx'
import { kaufTextSchluessel } from './disc-ausgabe.ts'
import { formateJeDatum, istKommend, kompaktDatum, zielVon, type Variante } from './disc-varianten.ts'
import { MerkenKnopf } from './merken.tsx'
import { Pille } from './pille.tsx'

/*
  Die Varianten des Disc-Bereichs als Pillen (Mockup `disc-bereich-3`, Variante A, 26.11.2026): gebaut wie die Stream-Pillen,
  die ganze Pille führt mit einem Klick zum Händler (ohne Händler zum aniSearch-Artikel). Der Kalenderknopf steht nur bei
  Kommendem daneben. Schrift: Name 15 px, Format und Datum 13 px, Formatmarke 11 px; jede Pille mindestens 52 px hoch.
*/

/** „ab 15.01.27“ in Akzent für Kommendes, „seit 03.09.26“ leise für Erschienenes; ohne Datum nichts. */
function DatumText({ iso, today }: { iso: string; today: string }) {
  const { t } = useLang()
  if (!iso) return null
  const kommend = istKommend(iso, today)
  return <span className={`whitespace-nowrap tabular-nums ${kommend ? 'font-bold text-ak-akzent-text' : ''}`}>{t(kommend ? 'disc.ab' : 'antwort.discSeit', { datum: kompaktDatum(iso) })}</span>
}

/** Zweite Zeile der Pille: je Datum die Formate als Marke und das Datum, rechts das Ziel des Klicks. */
function Unten({ v, today }: { v: Variante; today: string }) {
  const { t } = useLang()
  const ziel = zielVon(v)
  return (
    /* Wird es eng, rutscht das Ziel unter Format und Datum, statt den Namen zu quetschen. */
    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {formateJeDatum(v).map((g) => (
          <span key={g.datum} className="inline-flex items-center gap-1">
            {g.formate.map((f) => (
              <span key={f} className="whitespace-nowrap rounded border border-ak-rand px-1 text-t5 font-bold uppercase tracking-[.04em] text-ak-text">
                {t(`disc.format.${f}` as TranslationKey)}
              </span>
            ))}
            <DatumText iso={g.datum} today={today} />
          </span>
        ))}
      </span>
      {ziel && (
        <span className="whitespace-nowrap font-semibold text-ak-akzent-text" data-disc-ziel>
          {ziel.haendler ? t(kaufTextSchluessel(ziel.url), { shop: ziel.haendler }) : t('disc.details')} <span aria-hidden="true">↗</span>
        </span>
      )}
    </span>
  )
}

/** Name fett, Edition leise dahinter — der Reihentitel steht schon im Kopf des Panels. */
function Name({ v }: { v: Variante }) {
  return (
    <>
      {v.name}
      {v.edition && <span className="font-normal text-ak-leise"> · {v.edition}</span>}
    </>
  )
}

/** Eine Pille je Variante, untereinander und gleich breit. */
export function DiscPillen({ liste, today }: { liste: Variante[]; today: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {liste.map((v) => (
        <li key={v.schluessel} data-disc-variante>
          <Pille
            breit
            name={<Name v={v} />}
            url={zielVon(v)?.url}
            unten={<Unten v={v} today={today} />}
            icon={
              <span className="text-ak-leise">
                <DiscZeichen className="size-5" />
              </span>
            }
            aktion={<MerkenKnopf release={v.release} today={today} zeile />}
          />
        </li>
      ))}
    </ul>
  )
}
