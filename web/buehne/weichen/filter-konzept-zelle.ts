/** Die Parameter der Zelle (`#zelle?mockup=…&v=…&fall=…`), solange die Adresse noch die der Zelle ist (die App schreibt sie später um). */
const zellenWerte = ((): URLSearchParams => new URLSearchParams(location.hash.split('?')[1] ?? ''))()

/** Ist das die Vorher-Zelle (`v` leer) des Mockups `filter-konzept`? Jede Zelle ist ein eigener Rahmen, die Auskunft gilt je Zelle. */
export const istVorherZelle = (): boolean => zellenWerte.get('mockup') === 'filter-konzept' && (zellenWerte.get('v') ?? '') === ''

/** Der Fall der Zelle. */
export const zellenFall = (): string => zellenWerte.get('fall') ?? ''
