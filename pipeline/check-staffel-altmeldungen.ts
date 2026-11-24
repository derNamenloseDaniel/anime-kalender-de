/**
 * Zusicherung (F157, 24.11.2026): **alte Meldungen aus der Zeit der Staffel-Titel werden über die feste Tabelle der Yaml gelesen**
 * (`pipeline/lib/staffel-altmeldungen.ts` → `staffelVonTiteln`/`zurueckAufSammeltitel`, `shared/staffel-titel.ts`), nicht aus gebauten Titeln.
 * Dazu die Staffelnamen der Detaildatei (`sn`) und die Synonyme für die Suche. Läuft in `check:logic`.
 */
import { zurueckAufSammeltitel, staffelVonTiteln } from '../shared/staffel-titel.ts'
import { altStaffelTitel } from './lib/staffel-altmeldungen.ts'
import { HORIZONTE_STAFFELN, ladeStaffelGrenzen, staffelNamen, staffelNamenFeld, type StaffelGrenzen } from './lib/pokemon-staffeln.ts'
import { beobachtungenDerSpanne, staffelVonJeMeldung } from './lib/urteil-spanne.ts'

let faelle = 0
let fehler = 0
function pruefe(name: string, ok: boolean, ...info: unknown[]): void {
  faelle++
  if (ok) return
  fehler++
  console.log(`✖ ${name}`, ...info.map((x) => JSON.stringify(x)))
}

const grenzen = ladeStaffelGrenzen(HORIZONTE_STAFFELN)
const tabelle = altStaffelTitel(grenzen)
const echt = grenzen.find((g) => g.anilistId === 158871)!
const BIS = echt.staffelzaehlung!.bis
pruefe('Tabelle: 7000001–7000003 und die Serie mit Fenster', JSON.stringify(tabelle) === JSON.stringify([{ id: 7000001, staffelTitel: { sammel: 158871, ab: 1 } }, { id: 7000002, staffelTitel: { sammel: 158871, ab: 46 } }, { id: 7000003, staffelTitel: { sammel: 158871, ab: 90 } }, { id: 158871, staffelTitel: { sammel: 158871, ab: 137, aktiv: '2026-11-24', bis: BIS, laengste: 47 } }]), tabelle)
pruefe('Fenster der Staffelzählung beginnt am 24.11.2026, längste Staffel 47', tabelle[3]!.staffelTitel.aktiv === '2026-11-24' && tabelle[3]!.staffelTitel.laengste === 47)

const von = staffelVonTiteln(tabelle)
const z = (titel: number, folge: number, tag?: string) => JSON.stringify(zurueckAufSammeltitel(titel, folge, von, tag))
pruefe('alte Staffel 2, Folge 5 → 158871 Folge 50', z(7000002, 5, '2026-11-22') === '{"titel":158871,"folge":50}')
pruefe('alte Staffel 3, Folge 5 → 158871 Folge 94 (auch nach dem Rückbau gemeldet)', z(7000003, 5, '2026-12-01') === '{"titel":158871,"folge":94}')
pruefe('alte Staffel 1, Folge 0 (ganze Seite) bleibt 0', z(7000001, 0) === '{"titel":158871,"folge":0}')
pruefe('Serie im Fenster: Folge 1 → 137', z(158871, 1, '2026-11-24') === '{"titel":158871,"folge":137}')
pruefe('Serie im Fenster, Nummer über der längsten Staffel: durchlaufend', z(158871, 48, '2026-11-24') === '{"titel":158871,"folge":48}')
pruefe('Serie vor dem Fenster: durchlaufend', z(158871, 1, '2026-11-23') === '{"titel":158871,"folge":1}')
pruefe('Serie am Tag `bis` (Rückbau live): wieder durchlaufend', z(158871, 1, BIS) === '{"titel":158871,"folge":1}')
pruefe('gewöhnlicher Titel unverändert', z(20, 3, '2026-11-24') === '{"titel":20,"folge":3}')
pruefe('Serie ohne Tag der Meldung: durchlaufend', z(158871, 1) === '{"titel":158871,"folge":1}')
const ohneAktiv = staffelVonTiteln([{ id: 900591, staffelTitel: { sammel: 900591, ab: 10 } }])
pruefe('Serie ohne Fenster (`aktiv`): durchlaufend', zurueckAufSammeltitel(900591, 1, ohneAktiv, '2026-11-24').folge === 1)
pruefe('Kulisse ohne `staffelzaehlung`: nur die alten Kennungen, keine Zeile für die Serie', JSON.stringify(altStaffelTitel([{ anilistId: 900582, staffeln: [{ nr: 1, von: 1, bis: 5, alteKennung: 7900002 }, { nr: 2, von: 6, offen: true }] }]).map((t) => t.id)) === '[7900002]')

/* Gleiche Lesart mit Grenzen aus einer Kulisse: der Versatz folgt der Yaml, nicht einer festen Zahl. */
const kulisse: StaffelGrenzen[] = [{ anilistId: 900581, staffelzaehlung: { von: '2026-01-10', bis: '2026-01-12' }, staffeln: [{ nr: 1, von: 1, bis: 10, alteKennung: 7900001 }, { nr: 2, von: 11, offen: true }] }]
const vk = staffelVonTiteln(altStaffelTitel(kulisse))
pruefe('Kulisse: Serie im Fenster Folge 2 → 12, alte Staffel 1 Folge 4 → 4', zurueckAufSammeltitel(900581, 2, vk, '2026-01-11').folge === 12 && zurueckAufSammeltitel(7900001, 4, vk).titel === 900581)
pruefe('Kulisse ohne alte Kennungen: keine Tabelle', altStaffelTitel([{ anilistId: 1, staffeln: [{ nr: 1, von: 1 }] }]).length === 0)

/* So liest `fetch-urteile` (`staffelVonJeMeldung`): Meldung zur Serie im Fenster nur, wenn die Adresse an der Serie hängt. */
const je = staffelVonJeMeldung(tabelle)
const gemeinsam = { anbieter: 'rtlplus', vorhanden: 'ja', tonDe: 'ja', art: 'seite', tag: '2026-11-24', kanal: false } as never
pruefe('Urteile: Spanne 1–2 an der Serie im Fenster → 137, 138', JSON.stringify(beobachtungenDerSpanne(158871, { von: 1, bis: 2 }, gemeinsam, je([158871])).map((b) => b.folge)) === '[137,138]')
pruefe('Urteile: alte Staffel 2, Spanne 3–4 → 158871, 48–49', JSON.stringify(beobachtungenDerSpanne(7000002, { von: 3, bis: 4 }, gemeinsam, je(undefined)).map((b) => [b.titel, b.folge])) === '[[158871,48],[158871,49]]')

/* Staffelnamen wörtlich aus der Yaml in die Detaildatei (`sn`). */
const sn = staffelNamenFeld(staffelNamen(grenzen), 158871).sn ?? {}
pruefe('sn: vier Namen, Staffel 3 wörtlich', Object.keys(sn).join() === '1,2,3,4' && sn['3'] === 'Pokémon Horizonte: Staffel 3 – Gute Aussichten', sn)
pruefe('sn: Titel ohne Namen in der Yaml bekommt kein Feld', JSON.stringify(staffelNamenFeld(staffelNamen(kulisse), 900581)) === '{}')

console.log(`check-staffel-altmeldungen: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
