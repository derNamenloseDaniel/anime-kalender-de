import { folgenText, HORIZONTE_STAFFELN, MERKEN_HINWEIS, STATUS_TEXT, type StaffelZeile } from './staffel-abschnitt-daten.ts'
import './reihen-box.css'

/** Sprung zur Reihen-Karte (Verbindung zur Hauptserie bleibt wie heute über die Reihe); sie blitzt kurz auf. */
function springZurReihe(): void {
  const karte = document.querySelector('[data-reihe-liste]')?.closest('section')
  if (!karte) return
  karte.scrollIntoView({ block: 'center', behavior: 'smooth' })
  karte.classList.remove('buehne-blitz')
  void karte.offsetWidth
  karte.classList.add('buehne-blitz')
}

function StatusMarke({ s }: { s: StaffelZeile }) {
  const laeuft = s.status === 'laeuft'
  return (
    <span className={`text-t4 font-semibold ${laeuft ? 'text-ak-akzent-text' : 'text-ak-leise'}`}>
      {laeuft && <span aria-hidden="true">● </span>}
      {STATUS_TEXT[s.status]}
    </span>
  )
}

/** Die Anbieter der Staffel als eine Zeile: „RTL+ ab 20.11. · TOGGO ab 27.11.“. */
function woText(s: StaffelZeile): string {
  return s.wo.map((w) => (w.ab ? `${w.name} ab ${w.ab}` : w.name)).join(' · ')
}

function FolgenListe({ s }: { s: StaffelZeile }) {
  if (!s.bekannteFolgen) return <p className="px-3 pb-3 text-t4 text-ak-leise">Folgen {s.von}–{s.bis}.</p>
  return (
    <ul className="px-3 pb-3 text-t3 text-ak-text">
      {s.bekannteFolgen.map((f) => (
        <li key={f.gesamt} className="flex gap-2 py-1">
          <span className="w-10 shrink-0 text-ak-leise tabular-nums">F {f.inStaffel}</span>
          <span className="min-w-0">{f.titel}</span>
        </li>
      ))}
    </ul>
  )
}

/** Eine Staffel: Zeile mit Name, Folgenzahl, Status, Synchro und Wo; die laufende ist aufgeklappt. */
function StaffelEintrag({ s }: { s: StaffelZeile }) {
  return (
    <details open={s.status === 'laeuft'} className="group rounded-lg border border-ak-rand bg-ak-flaeche">
      <summary className="relative flex min-h-11 cursor-pointer list-none flex-col justify-center gap-0.5 py-2 pr-9 pl-3">
        <span aria-hidden="true" className="absolute top-3 right-3 text-ak-leise transition-transform group-open:rotate-180">▾</span>
        <span className="text-t3 font-semibold text-ak-text">
          Staffel {s.nr}: {s.name}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-t4 text-ak-leise">
          <span>{folgenText(s)}</span>
          <StatusMarke s={s} />
          <span>Synchro: deutsch</span>
        </span>
        <span className="text-t4 text-ak-leise">Wo: {woText(s)}</span>
      </summary>
      <FolgenListe s={s} />
    </details>
  )
}

/** Der neue Abschnitt unter dem Kopf: Merken-Hinweis, Staffelliste, Sprung zur Hauptserie. */
export function StaffelAbschnitt() {
  return (
    <section aria-label="Staffeln" className="px-4 pb-4">
      <p className="pb-2 text-t4 text-ak-leise">{MERKEN_HINWEIS}</p>
      <h3 className="pb-2 text-t3 font-bold text-ak-text">Staffeln</h3>
      <div className="flex flex-col gap-2">
        {HORIZONTE_STAFFELN.map((s) => (
          <StaffelEintrag key={s.nr} s={s} />
        ))}
      </div>
      <button
        type="button"
        onClick={springZurReihe}
        className="mt-3 min-h-11 rounded-full border border-ak-rand px-3 py-1 text-xs font-semibold text-ak-akzent-text"
      >
        Zur Pokémon-Hauptserie <span aria-hidden="true">↓</span>
      </button>
    </section>
  )
}
