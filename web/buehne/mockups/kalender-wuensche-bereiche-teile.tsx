import type { ComponentProps, ReactNode } from 'react'
import type { KastenPillen } from '../../src/components/detail/antwort-kasten-teile.tsx'

type Eigenschaften = ComponentProps<typeof KastenPillen>
type Bereich = 'frei' | 'abo' | 'kauf' | 'tv' | 'unbekannt' | 'offen'

/** Farbe, Überschrift und Unterzeile je Bereich; die Farben sind vorhandene `ak-*`-Rollen (Grün = gut, Blau = info, Bernstein = warnung, Türkis = tv). */
const BEREICH: Record<Bereich, { kopf: string; unter: string; fuellung: string; streifen: string; text: string }> = {
  frei: { kopf: 'Kostenlos', unter: 'Ohne Abo, ohne Zahlung', fuellung: 'bg-ak-gut-grund', streifen: 'border-ak-gut', text: 'text-ak-gut-text' },
  abo: { kopf: 'Im Abo', unter: 'Mit dem Abo des Anbieters, ohne Aufpreis', fuellung: 'bg-ak-info-grund', streifen: 'border-ak-info', text: 'text-ak-info-text' },
  kauf: { kopf: 'Kaufen oder leihen', unter: 'Kostet extra – auch bei Prime Video', fuellung: 'bg-ak-warnung-grund', streifen: 'border-ak-warnung', text: 'text-ak-warnung-text' },
  tv: { kopf: 'Im Fernsehen', unter: 'Zur Sendezeit', fuellung: 'bg-ak-tv-grund', streifen: 'border-ak-tv', text: 'text-ak-tv' },
  unbekannt: { kopf: 'Weitere', unter: 'Zugang nicht geprüft', fuellung: 'bg-ak-flaeche-2', streifen: 'border-ak-rand', text: 'text-ak-leise' },
  offen: { kopf: 'Weitere Anbieter', unter: 'Zugang nicht geprüft', fuellung: 'bg-ak-flaeche-2', streifen: 'border-ak-rand', text: 'text-ak-leise' },
}

const REIHENFOLGE: Bereich[] = ['frei', 'abo', 'kauf', 'tv', 'unbekannt', 'offen']
const PILLEN_REIHE = 'flex flex-wrap items-start gap-x-2 gap-y-4 pt-2'

function Kopf({ art, stil, kostenlosKopf }: { art: Bereich; stil: 'A' | 'B'; kostenlosKopf: string | undefined }) {
  const b = BEREICH[art]
  return (
    <div className="flex flex-col">
      <span className={`text-t3 font-bold ${b.text}`}>
        {art === 'frei' && kostenlosKopf ? kostenlosKopf : b.kopf}
        {stil === 'B' && art === 'kauf' && <span className="ml-2 rounded-full border border-ak-warnung px-2 py-0.5 text-t5 font-semibold">kostet extra</span>}
      </span>
      {stil === 'A' && <span className="text-t4 text-ak-leise">{b.unter}</span>}
    </div>
  )
}

function Block({ art, stil, kostenlosKopf, children }: { art: Bereich; stil: 'A' | 'B'; kostenlosKopf: string | undefined; children: ReactNode }) {
  const b = BEREICH[art]
  /* A: gefüllte Fläche wie der grüne Kostenlos-Block heute; B: nur Farbstreifen links, ruhiger. */
  const rahmen = stil === 'A' ? `rounded-lg p-2.5 ${b.fuellung}` : `border-l-4 pl-3 ${b.streifen}`
  return (
    <div className={`flex flex-col gap-1 ${rahmen}`} data-bereich={art}>
      <Kopf art={art} stil={stil} kostenlosKopf={kostenlosKopf} />
      <div className={PILLEN_REIHE}>{children}</div>
    </div>
  )
}

/** Die Wege-Pillen mit eigener Farbe und deutlicherer Überschrift je Bereich; Pillen, Reihenfolge und Zuordnung bleiben die echten. */
export function BereichePillen({ stil, ...p }: Eigenschaften & { stil: 'A' | 'B' }) {
  if (!p.pillen.length) return null
  return (
    <div className="mt-auto shrink-0 border-t border-ak-linie pt-2.5">
      {p.mitBereichen ? (
        <div className="flex w-full flex-col gap-3 pt-2">
          {REIHENFOLGE.map((art) => {
            const teil = p.pillen.filter((q) => p.gruppeVon(q) === art)
            return teil.length ? <Block key={art} art={art} stil={stil} kostenlosKopf={p.kostenlosKopf}>{teil}</Block> : null
          })}
          {/* Ohne Gruppe (Termine u. Ä.) bleibt wie heute ohne Überschrift. */}
          {p.pillen.some((q) => p.gruppeVon(q) === 'sonst') && <div className={PILLEN_REIHE}>{p.pillen.filter((q) => p.gruppeVon(q) === 'sonst')}</div>}
        </div>
      ) : (
        <div className={`${PILLEN_REIHE} pt-2`}>{p.pillen}</div>
      )}
      {p.legende && !p.aktivDisc && <p className="mt-2 text-t4 text-ak-leise">{p.legende}</p>}
    </div>
  )
}
