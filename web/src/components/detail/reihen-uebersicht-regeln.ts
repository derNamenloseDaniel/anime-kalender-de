import type { FranchiseMember } from '@shared/types.ts'

export type Gruppe = { titel: string; teile: FranchiseMember[] }

/** Eine Gruppe über 12 Teilen macht die Reihe zur Übersicht (design-regeln.md, Abschnitt 13, E4). */
export const GROSSE_GRUPPE = 12

const suchKern = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * Die Gruppen, wie sie gerade zu sehen sind: ohne Suchtext alle Teile (auch ohne Synchro), mit Suchtext die Treffer;
 * leere Gruppen fallen weg. Jede Zahl der Reihen-Karte kommt hierher, damit Zahl und Liste nie auseinanderlaufen.
 */
export function gezeigteGruppen(gruppen: Gruppe[], suchText: string): Gruppe[] {
  const passt = (m: FranchiseMember) => suchKern(`${m.name} ${m.jpYear ?? ''}`).includes(suchKern(suchText))
  return gruppen
    .map((g) => ({ ...g, teile: g.teile.filter((m) => !suchText || passt(m)) }))
    .filter((g) => g.teile.length > 0)
}

/** Zahl am Kopf der Karte: alle gerade gezeigten Teile, also die Summe der Gruppenzahlen. */
export function gezeigteZahl(gruppen: Gruppe[]): number {
  return gruppen.reduce((summe, g) => summe + g.teile.length, 0)
}

/** Groß ist eine Reihe, wenn eine Gruppe über 12 Teile zeigt. */
export function istGrosseReihe(gruppen: Gruppe[]): boolean {
  return gruppen.some((g) => g.teile.length > GROSSE_GRUPPE)
}

/** Titel der Gruppe, die den Teil enthält. */
export function gruppeVon(gruppen: Gruppe[], id: number): string | undefined {
  return gruppen.find((g) => g.teile.some((m) => m.id === id))?.titel
}
