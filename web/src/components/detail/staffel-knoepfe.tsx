import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { staffelSpanne, type StaffelZiel } from '../../lib/staffel-ziele.ts'
import { Pille } from './pille.tsx'

type Translate = (k: string, v?: Record<string, string | number>) => string

type PilleEigenschaften = ComponentProps<typeof Pille>

const KNOPF = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 px-3 text-t3 font-semibold tabular-nums text-ak-text transition hover:bg-ak-pille-hover'

const staffelText = (t: Translate, n: string | number) => t('detail.staffelNummer', { n })

/** Eine TOGGO-Fläche statt einer Pille: Überschrift „TOGGO · Staffel 1–5“, darin je Adresse ein Zahlenknopf (mindestens 44 px, Rahmen in der Anbieterfarbe). */
export function PilleMitKnoepfen({ eig, ziele, t }: { eig: PilleEigenschaften; ziele: StaffelZiel[]; t: Translate }) {
  const { von, bis } = staffelSpanne(ziele)
  const bereich = von === bis ? staffelText(t, von) : t('detail.staffelBereich', { von, bis })
  return (
    <Pille
      {...eig}
      name={`${String(eig.name)} · ${bereich}`}
      url={undefined}
      fuss={
        <div role="group" aria-label={`${String(eig.name)}, ${bereich}`} className="flex flex-wrap gap-1">
          {ziele.map((z) => (
            <a key={z.url} href={z.url} target="_blank" rel="noreferrer noopener" aria-label={`${String(eig.name)}, ${staffelText(t, z.nummer)}`} className={KNOPF} style={{ borderColor: eig.farbe }}>
              {z.nummer}
            </a>
          ))}
        </div>
      }
    />
  )
}

const istToggoWeg = (n: ReactNode): n is ReactElement<PilleEigenschaften> => isValidElement(n) && String(n.key).startsWith('sw-TOGGO-')

/** Ersetzt die TOGGO-Pille der Wege durch die Knopffläche (mit demselben `key`: die Zugangsgruppe hängt daran); ohne Staffelseiten bleibt alles wie es ist. */
export function mitStaffelKnoepfen(pillen: ReactNode[], ziele: StaffelZiel[] | undefined, t: Translate): ReactNode[] {
  if (!ziele) return pillen
  return pillen.map((n) => (istToggoWeg(n) ? <PilleMitKnoepfen key={n.key} eig={n.props} ziele={ziele} t={t} /> : n))
}
