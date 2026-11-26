import type { FranchiseMember } from '../../shared/types.ts'
import { readJson } from './util.ts'
import { abgaengeOhneGrund, FREIGABE_HINWEIS, leseVorstandJson, ohneFreigabe } from './vorstand-abgang.ts'

type Reihen = Record<string, Pick<FranchiseMember, 'id' | 'remakeVon'>[]>
const REIHEN = 'public/data/franchises.json'

const paare = (r: Reihen): string[] => Object.values(r).flat().filter((m) => m.remakeVon !== undefined).map((m) => `${m.id}|${m.remakeVon}`)

/**
 * Neuverfilmungen (`remakeVon` in `franchises.json`), die im Vorstand markiert waren und es jetzt nicht mehr sind, obwohl Neuverfilmung
 * und Original noch in den Reihen stehen. Die Wache rechnet sonst mit `markiereRemakes`, derselben Funktion wie der Bau. Schlüssel: `<Neuverfilmung>|<Original>`.
 */
export function remakeAbgaenge(vorher: Reihen, jetzt: Reihen): string[] {
  const da = new Set(Object.values(jetzt).flat().map((m) => m.id))
  return abgaengeOhneGrund(paare(vorher), new Set(paare(jetzt)), (k) => !k.split('|').every((id) => da.has(Number(id))))
}

/** Die Wache am echten Bestand: Fehlerzeilen gegen den Vorstand `ref`; ein nicht lesbarer Vorstand ist selbst ein Fehler. */
export function remakeGegenVorstand(ref: string): string[] {
  let vorher: Reihen
  try {
    vorher = leseVorstandJson<Reihen>(REIHEN, ref) ?? {}
  } catch (e) {
    return [`Vorstand ${ref} nicht lesbar: ${(e as Error).message.split('\n')[0]}`]
  }
  const weg = ohneFreigabe(remakeAbgaenge(vorher, readJson<Reihen>(REIHEN, {})), 'remake-zaehlung')
  return weg.length ? [`${weg.length} Neuverfilmung(en) waren im Vorstand ${ref} markiert und sind es jetzt nicht mehr: ${weg.slice(0, 10).join(', ')} (${FREIGABE_HINWEIS})`] : []
}
