import { staffelSpanne, type StaffelNummer } from '@shared/titles.ts'

/** „Staffel 4", „Staffel 4 - Teil 2" bzw. „Staffel 7 - Teil 2–3". */
export function staffelKurz(n: Pick<StaffelNummer, 'staffel' | 'bis' | 'teil' | 'teilBis'>): string {
  return n.teil ? `Staffel ${n.staffel} - Teil ${n.teil}${n.teilBis ? `–${n.teilBis}` : ''}` : `Staffel ${staffelSpanne(n)}`
}

/**
 * Ein Rest aus Zahl oder Satzzeichen („0", „2.0", „!") sagt allein nichts: Aus „Jujutsu Kaisen 0" wurde in der Liste „0" (12.10.2026).
 * Klammern bleiben, „(2016)" unterscheidet zwei Fassungen.
 */
export function istNichtssagend(rest: string): boolean {
  return rest !== '' && !/[\p{L}()]/u.test(rest)
}

/** Der Name eines Teils ohne Reihenname; ist der Rest nichtssagend oder leer, steht der volle Name da. */
export function kurzName(rest: string, voll: string): string {
  return rest && !istNichtssagend(rest) ? rest : voll
}

/**
 * Der Zusatz hinter „Staffel N ·": der Rest, bei nichtssagendem Rest der volle Name — außer der Rest ist nur die Staffelnummer selbst.
 * Bleibt er leer, steht `unterschied` da (`reihen-doppelt.ts`: Karten mit gleicher Beschriftung).
 */
export function zeilenZusatz(nr: Pick<StaffelNummer, 'staffel' | 'eigenerName'>, rest: string, voll: string, unterschied = ''): string {
  if (!nr.eigenerName || !rest) return unterschied
  if (!istNichtssagend(rest)) return rest
  return rest === String(nr.staffel) ? unterschied : voll
}
