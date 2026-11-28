import { teilBereich, type AnbieterTeil } from './anbieter-staffel.ts'

/**
 * **Umschalter zwischen den Teilen einer Staffel, die der Anbieter als eine führt** („Folge 1–12 | Folge 13–38“, Stone Ocean). Jeder Teil
 * ist ein eigener Titel; die Wahl öffnet ihn auf dem Weg der Reiter. Dasselbe Muster wie der Stream/Disc-Umschalter (`umschalter.tsx`), Tippfläche
 * mindestens 44 px (design-regeln.md E2). Ohne zwei Teile steht nichts da.
 */
export function TeilUmschalter({ teile, aktiv, beiWahl }: { teile: AnbieterTeil[]; aktiv: number; beiWahl: (id: number) => void }) {
  if (teile.length < 2) return null
  return (
    <div data-teil-umschalter className="mt-2 inline-flex rounded-full border border-ak-rand bg-ak-flaeche p-0.5 text-t3" role="tablist" aria-label="Teil der Staffel">
      {teile.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === aktiv}
          onClick={() => beiWahl(t.id)}
          className={['min-h-11 rounded-full px-4 tabular-nums transition', t.id === aktiv ? 'bg-ak-gewaehlt font-bold text-ak-auf-gewaehlt' : 'text-ak-leise hover:text-ak-text'].join(' ')}
        >
          {teilBereich(t)}
        </button>
      ))}
    </div>
  )
}
