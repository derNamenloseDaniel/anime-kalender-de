import type { ReactNode } from 'react'
import { MerkenKnopf } from '../../src/components/detail/merken.tsx'
import { spaltenVon, type Variante } from '../../src/components/detail/disc-varianten.ts'
import { DiscZeichen } from '../../src/components/ui.tsx'
import type { DiscBereichEigenschaften } from '../ersatz.tsx'
import { DatumText, FORMAT_NAME, FormatMarke, formateJeDatum, Rahmen, zielVon } from './disc-bereich-3-teile.tsx'

/*
  Drei Antworten auf „zu unscheinbar, zu viele Klicks“ (Daniel, 26.11.2026). Allen gemeinsam: Jede Variante trägt ihr Ziel
  sichtbar (Händler, sonst aniSearch-Artikel) — ein Klick, kein Aufklappen; der Kalenderknopf steht nur bei Kommendem daneben.
*/

const RING = '[--pille-ring:rgba(15,23,42,.12)] dark:[--pille-ring:rgba(255,255,255,.08)]'
const VERWEIS = { target: '_blank', rel: 'noreferrer noopener' }

/** Name fett, Edition leise dahinter — der Reihentitel steht schon im Kopf des Panels. */
function Name({ v, klasse = 'text-t3' }: { v: Variante; klasse?: string }) {
  return (
    <span className={`${klasse} font-semibold`}>
      {v.name}
      {v.edition && <span className="font-normal text-ak-leise"> · {v.edition}</span>}
    </span>
  )
}

/** „BLU-RAY DVD seit 13.11.26“, je Datum ein Stück. */
function FormatZeile({ v, today }: { v: Variante; today: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-t4 text-ak-leise">
      {formateJeDatum(v).map((g) => (
        <span key={g.datum} className="inline-flex items-center gap-1">
          {g.formate.map((f) => (
            <FormatMarke key={f} f={f} />
          ))}
          <DatumText iso={g.datum} today={today} />
        </span>
      ))}
    </span>
  )
}

/* ---------- A: eine Pille je Variante, wie die Stream-Pillen; die ganze Pille führt zum Händler ---------- */

function DiscPille({ v, today }: { v: Variante; today: string }) {
  const ziel = zielVon(v)
  return (
    <li className="flex items-center gap-1">
      <a href={ziel?.url} {...VERWEIS} className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-ak-pille py-1.5 pl-3.5 pr-3 text-ak-text shadow-[inset_0_0_0_1px_var(--pille-ring)] transition hover:bg-ak-pille-hover ${RING}`}>
        <span className="text-ak-leise">
          <DiscZeichen className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Name v={v} />
          {/* Das Ziel steht rechts neben Format und Datum; wird es eng, rutscht es darunter statt den Namen zu quetschen. */}
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <FormatZeile v={v} today={today} />
            {ziel && (
              <span className="whitespace-nowrap text-t4 font-semibold text-ak-akzent-text">
                {ziel.text} <span aria-hidden="true">↗</span>
              </span>
            )}
          </span>
        </span>
      </a>
      <MerkenKnopf release={v.release} today={today} zeile />
    </li>
  )
}

export function DiscPillen(e: DiscBereichEigenschaften) {
  const zeige = (liste: Variante[]): ReactNode => (
    <ul className="flex flex-col gap-1.5">
      {liste.map((v) => (
        <DiscPille key={v.schluessel} v={v} today={e.today} />
      ))}
    </ul>
  )
  return <Rahmen e={e} zeige={zeige} />
}

/* ---------- B: die Matrix bleibt, steht aber offen; letzte Spalte ist der Händler als Knopf ---------- */

const KNOPF = 'inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-ak-rand px-2.5 text-t4 font-semibold text-ak-akzent-text hover:bg-ak-flaeche-2'

function MatrixOffen({ liste, today }: { liste: Variante[]; today: string }) {
  const spalten = spaltenVon(liste)
  const raster = { gridTemplateColumns: `minmax(0,1fr) repeat(${spalten.length}, 3.6rem) 6.2rem` }
  return (
    <div className="flex flex-col">
      <div className="grid gap-x-1 pb-0.5 text-t5 font-bold uppercase tracking-[.04em] text-ak-leise" style={raster} aria-hidden="true">
        <span />
        {spalten.map((f) => (
          <span key={f} className="text-center">{FORMAT_NAME[f]}</span>
        ))}
        <span />
      </div>
      <ul>
        {liste.map((v) => {
          const ziel = zielVon(v)
          return (
            <li key={v.schluessel} className="grid min-h-[52px] items-center gap-x-1 border-t border-ak-linie py-1" style={raster}>
              <Name v={v} klasse="text-t4" />
              {spalten.map((f) => (
                <span key={f} className="text-center text-t5 text-ak-leise">
                  {v.datumJe[f] ? <DatumText iso={v.datumJe[f]!} today={today} /> : '–'}
                </span>
              ))}
              {ziel ? (
                <a href={ziel.url} {...VERWEIS} className={KNOPF}>
                  {ziel.kurz} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function DiscMatrixOffen(e: DiscBereichEigenschaften) {
  return <Rahmen e={e} zeige={(liste) => <MatrixOffen liste={liste} today={e.today} />} />
}

/* ---------- C: Karten zu zweit, Gesamtausgaben über die ganze Breite; unten der Händler als Knopf ---------- */

function DiscKarte({ v, today }: { v: Variante; today: string }) {
  const ziel = zielVon(v)
  return (
    <li className={`flex flex-col gap-1.5 rounded-xl border border-ak-rand bg-ak-flaeche p-2.5 ${v.art === 'gesamt' ? 'col-span-2' : ''}`}>
      <Name v={v} />
      <FormatZeile v={v} today={today} />
      <div className="mt-auto flex items-center gap-1 pt-1">
        {ziel && (
          <a href={ziel.url} {...VERWEIS} className={`${KNOPF} min-w-0 flex-1 bg-ak-flaeche-2`}>
            {ziel.text} <span aria-hidden="true">↗</span>
          </a>
        )}
        <MerkenKnopf release={v.release} today={today} zeile />
      </div>
    </li>
  )
}

export function DiscKarten3(e: DiscBereichEigenschaften) {
  const zeige = (liste: Variante[]): ReactNode => (
    <ul className="grid grid-cols-2 gap-2">
      {liste.map((v) => (
        <DiscKarte key={v.schluessel} v={v} today={e.today} />
      ))}
    </ul>
  )
  return <Rahmen e={e} zeige={zeige} />
}
