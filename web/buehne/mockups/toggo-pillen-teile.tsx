import { createContext, isValidElement, useContext, useEffect, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { loadJson } from '../../src/lib/data.ts'
import { KastenPillen as EchteKastenPillen } from '../../src/components/detail/antwort-kasten-teile.tsx'
import { AntwortKastenMitMarke } from '../../src/components/detail/kasten-marke.tsx'
import { Pille } from '../../src/components/detail/pille.tsx'
import { staffelZiele, type StaffelZiel } from './toggo-pillen-liste.ts'

type PillenEigenschaften = ComponentProps<typeof EchteKastenPillen>
type PilleEigenschaften = ComponentProps<typeof Pille>

const TitelKontext = createContext<number | undefined>(undefined)

/** Wie der echte Kasten, nur mit der Titelkennung im Kontext: die Pillen darunter wissen sonst nicht, zu welcher Folgenliste sie gehören. */
export function KastenMitTitel(eigenschaften: ComponentProps<typeof AntwortKastenMitMarke>) {
  return (
    <TitelKontext.Provider value={eigenschaften.title.id}>
      <AntwortKastenMitMarke {...eigenschaften} />
    </TitelKontext.Provider>
  )
}

/** Die Staffelseiten des Titels aus `tg` seiner Folgenliste; solange sie laden oder nicht verschieden sind: nichts. */
function useStaffelZiele(): StaffelZiel[] | undefined {
  const id = useContext(TitelKontext)
  const [ziele, setZiele] = useState<StaffelZiel[]>()
  useEffect(() => {
    setZiele(undefined)
    if (id === undefined) return
    let aktiv = true
    void loadJson<{ tg?: [number, string][] }>(`folgen/${id}.json`).then((j) => aktiv && setZiele(staffelZiele(j.tg)), () => {})
    return () => {
      aktiv = false
    }
  }, [id])
  return ziele
}

const KNOPF = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ak-flaeche-2 px-3 text-t3 font-semibold tabular-nums text-ak-text transition hover:bg-ak-pille-hover'

/** A: eine TOGGO-Pille, die Staffelseiten als Knopfreihe in ihrer Fußzeile (die echte Pille kennt `fuss`). */
function PilleMitKnoepfen({ eig, ziele }: { eig: PilleEigenschaften; ziele: StaffelZiel[] }) {
  return (
    <Pille
      {...eig}
      url={undefined}
      fuss={
        <div role="group" aria-label="TOGGO, Seite je Staffel" className="flex flex-wrap gap-1">
          {ziele.map((z) => (
            <a key={z.url} href={z.url} target="_blank" rel="noreferrer noopener" aria-label={`TOGGO, ${z.label.replace('S', 'Staffel ')}`} className={KNOPF}>
              {z.label}
            </a>
          ))}
        </div>
      }
    />
  )
}

/** B: je Staffelseite eine Pille mit eigener Adresse; der Sprachhinweis steht nur an der ersten. */
function PillenJeStaffel({ eig, ziele }: { eig: PilleEigenschaften; ziele: StaffelZiel[] }) {
  return (
    <div className="flex max-w-full flex-wrap items-start gap-x-2 gap-y-4">
      {ziele.map((z, i) => (
        <Pille key={z.url} {...eig} url={z.url} unten={z.label.replace('S', 'Staffel ')} status={i === 0 ? eig.status : undefined} />
      ))}
    </div>
  )
}

const istToggoWeg = (n: ReactNode): n is ReactElement<PilleEigenschaften> => isValidElement(n) && String(n.key).startsWith('sw-TOGGO-')

/** Die echten Wege-Pillen; nur die TOGGO-Pille wird ersetzt, mit demselben `key` (die Zugangsgruppe hängt daran). */
export function toggoKastenPillen(stil: 'A' | 'B') {
  return function ToggoKastenPillen(eigenschaften: PillenEigenschaften) {
    const ziele = useStaffelZiele()
    const pillen = eigenschaften.pillen.map((n) => {
      if (!ziele || !istToggoWeg(n)) return n
      return stil === 'A' ? <PilleMitKnoepfen key={n.key} eig={n.props} ziele={ziele} /> : <PillenJeStaffel key={n.key} eig={n.props} ziele={ziele} />
    })
    return <EchteKastenPillen {...eigenschaften} pillen={pillen} />
  }
}
