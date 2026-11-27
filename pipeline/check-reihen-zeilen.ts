/**
 * Zusicherungen für die Zeilen der Reihenliste (Daniel, 26.11.2026): Gruppen mit einem Teil stehen paarweise nebeneinander,
 * alle anderen in voller Breite, die Reihenfolge bleibt. Nur Fixtures, kein „heute“. Aufruf: `npm run check:logic`.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { FranchiseMember, Title } from '../shared/types.ts'
import { useLang } from '../web/src/lib/i18n.tsx'
import { ReihenListe } from '../web/src/components/detail/reihen-liste.tsx'
import { gruppenZeilen } from '../web/src/components/detail/reihen-zeilen.ts'

let verletzt = 0
const gleich = (name: string, ist: unknown, soll: unknown) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name} — gefunden: ${JSON.stringify(ist)}`)
}

const g = (titel: string, n: number) => ({ titel, teile: Array.from({ length: n }, (_, i) => ({ id: i }) as FranchiseMember) })
const form = (gruppen: ReturnType<typeof g>[]) => gruppenZeilen(gruppen).map((z) => z.map((x) => x.titel).join('+'))

gleich('Einzel + Einzel: eine Zeile', form([g('A', 1), g('B', 1)]), ['A+B'])
gleich('Einzel + Einzel + Mehrfach: zwei Zeilen', form([g('A', 1), g('B', 1), g('C', 3)]), ['A+B', 'C'])
gleich('drei Einzel: Paar, dann allein', form([g('A', 1), g('B', 1), g('C', 1)]), ['A+B', 'C'])
gleich('Einzel, Mehrfach, Einzel: Reihenfolge bleibt, keine Paarung', form([g('A', 1), g('B', 2), g('C', 1)]), ['A', 'B', 'C'])
gleich('vier Einzel: zwei Paare', form([g('A', 1), g('B', 1), g('C', 1), g('D', 1)]), ['A+B', 'C+D'])
gleich('eine Einzel-Gruppe: volle Breite', form([g('A', 1)]), ['A'])
gleich('nur Mehrfach: je eine Zeile', form([g('A', 2), g('B', 5)]), ['A', 'B'])
gleich('keine Gruppen: keine Zeilen', form([]), [])

/* Gerendert: zwei Einzel-Gruppen teilen sich ein Raster, die dritte steht allein. */
const teil = (id: number, name: string, mehr: Partial<FranchiseMember> = {}): FranchiseMember =>
  ({ id, name, format: 'TV', jpYear: 2020, episodes: 12, ...mehr }) as FranchiseMember
const { t } = useLang()
const html = renderToStaticMarkup(
  createElement(ReihenListe, {
    reihenTeile: [
      teil(910001, 'Yaiba'),
      teil(910002, 'Yaiba Special', { format: 'SPECIAL', episodes: 1, beiwerk: true }),
      teil(910003, 'Yaiba: Film 1', { format: 'MOVIE', episodes: 1 }),
    ],
    t,
    reihenName: 'Yaiba',
    title: { id: 910001 } as Title,
    favorites: new Set<number>(),
    wechselt: false,
    wechsleZu: () => {},
    reihenSchluessel: 1,
    reiheSuche: { reihe: 1, text: '' },
    setReiheSuche: () => {},
  }),
)
const zaehle = (muster: string) => html.split(muster).length - 1
gleich('Raster: Hauptserie + Filme teilen sich eine Zeile', zaehle('grid-cols-2'), 1)
gleich('Raster: drei Gruppen, drei Spuren (Specials allein)', zaehle('role="tablist"'), 3)
gleich('Raster: drei Karten', zaehle('role="tab"'), 3)

process.exit(verletzt ? 1 : 0)
