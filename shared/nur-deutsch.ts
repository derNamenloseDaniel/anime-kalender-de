/**
 * **Die Seite führt nur deutsche Fassungen** (Daniel, 26.11.2026: „OmU is only allowed in our data, not visible to users“).
 * Ein Release mit `sprache: 'omu'` bleibt im Datensatz (Bau, Wächter), erreicht aber keine Oberfläche: Termine (`expandEvents`),
 * Ansichten (`web/src/lib/data.ts`), Wege-Pillen (`wegeOhneNurUntertitel`) und Texte gehen alle über diese Stelle.
 */

/** Das Release (oder der Termin), dessen Quelle nur den Originalton mit Untertiteln nennt. */
export const istNurUntertitel = (r: { sprache?: string }): boolean => r.sprache === 'omu'

/** Alles, was ein Besucher sehen darf: ohne die Releases mit Untertiteln allein. */
export const fuerBesucher = <T extends { sprache?: string }>(liste: readonly T[]): T[] => liste.filter((r) => !istNurUntertitel(r))
