import type { ComponentProps } from 'react'
import { AntwortKastenMitMarke } from '../../src/components/detail/kasten-marke.tsx'
import { useDatensatz } from '../ausschnitte/datensatz.ts'
import { mockup } from '../register.ts'
import { ReiterUeberKasten } from './staffel-reiter.tsx'

/** Der echte Antwortkasten, mit den Staffel-Reitern der Reihe direkt darüber (ohne Staffeln: unverändert). */
function KastenMitReitern(eigenschaften: ComponentProps<typeof AntwortKastenMitMarke>) {
  const data = useDatensatz()
  const kasten = <AntwortKastenMitMarke {...eigenschaften} />
  return data ? <ReiterUeberKasten data={data} eigenschaften={eigenschaften} kasten={kasten} /> : kasten
}

mockup({
  name: 'staffel-abschnitt',
  titel: 'Staffel-Reiter an der roten Box (F157), nur echte Daten',
  ausschnitt: 'detailpanel',
  faelle: ['pokemon-horizonte', 'pokemon-sammeltitel', 'pokemon-reisen'],
  /* Stichtag 24.11.2026: Staffel 4 der Horizonte läuft seit 20.11.; zur Uhr der Bühne (11.10.) wäre sie „angekündigt“. */
  zeiten: { '24.11. 10:00': '2026-11-24T10:00:00+01:00' },
  varianten: {
    A: {
      ersatz: { AntwortKasten: KastenMitReitern },
      notiz: 'Karteikarten-Reiter sitzen oben an der Box. Der gewählte Reiter hat die Farbe der Box und geht ohne Kante in sie über; er trägt oben einen Akzentstrich, alle anderen sind ruhig grau. Ein Klick öffnet die Staffel mit ihrem Cover, ihrer Handlung und ihren Daten. Eine laufende Staffel trägt oben rechts einen Punkt, gewählt oder nicht; eine, die noch kommt, einen Ring. Alle Reiter, Titel und Zahlen sind echte Daten: Pokémon Horizonte hat 4 Staffeln, Pokémon (Hauptserie) 12 Reiter für die Staffeln 1 bis 25 (ein Eintrag der Daten deckt teils mehrere Staffeln ab, z. B. „1–5“). Eine Reihe mit mehr Staffelteilen gibt es im Datensatz nicht.',
    },
  },
})
