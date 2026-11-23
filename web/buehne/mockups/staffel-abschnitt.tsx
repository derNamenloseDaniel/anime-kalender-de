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
  varianten: {
    A: {
      ersatz: { AntwortKasten: KastenMitReitern },
      notiz: 'Karteikarten-Reiter hängen oben an der Box, links das Wort „Staffeln“. Der gewählte Reiter ist Teil der Box; ein Klick öffnet die Staffel mit ihrem Cover, ihrer Handlung und ihren Daten. Wo eine Staffel läuft, ist ihr Reiter gefüllt und trägt einen Punkt. Alle Reiter, Titel und Zahlen sind echte Daten: Pokémon Horizonte hat 4 Staffeln, Pokémon (Hauptserie) 12 Reiter für die Staffeln 1 bis 25 (ein Eintrag der Daten deckt teils mehrere Staffeln ab, z. B. „1–5“). Eine Reihe mit mehr Staffelteilen gibt es im Datensatz nicht.',
    },
  },
})
