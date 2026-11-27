import type { ReactNode } from 'react'
import { MerkenKnopf } from '../../src/components/detail/merken.tsx'
import { formateJeDatum, type Variante } from '../../src/components/detail/disc-varianten.ts'
import type { DiscBereichEigenschaften } from '../ersatz.tsx'
import { DatumText, FORMAT_NAME, FormatMarke, Rahmen, spaltenVon, zielMitText } from './disc-bereich-3-teile.tsx'

/*
  Die zwei nicht gewählten Antworten auf „zu unscheinbar, zu viele Klicks“ (Daniel, 26.11.2026); A (Pillen) ist gebaut und steht
  in `detail/disc-pillen.tsx`. Beiden gemeinsam: Jede Variante trägt ihr Ziel sichtbar (Händler, sonst aniSearch-Artikel).
*/

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
          const ziel = zielMitText(v)
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
  const ziel = zielMitText(v)
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
