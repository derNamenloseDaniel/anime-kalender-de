/** Pfeile der Staffel-Reiter (F157): wann sie bedienbar sind und wie weit ein Klick rollt. Rein, damit der Test es aus festen Zahlen prüft. */

/** `einblenden`: ein Pfeil steht nur, wenn in der Richtung weitere Reiter liegen; `immer`: beide stehen, ohne Reiter dahinter sind sie deaktiviert. */
export type PfeilModus = 'einblenden' | 'immer'

export interface PfeilLage {
  links: boolean
  rechts: boolean
}

/** Bruchteile von Pixeln beim Rollen (Zoom, Skalierung) dürfen keinen Pfeil geöffnet halten. */
const TOLERANZ = 1

/** Liegen links bzw. rechts der sichtbaren Leiste noch Reiter? Aus Scrollposition, Gesamtbreite und sichtbarer Breite. */
export function pfeilLageVon(scrollLeft: number, scrollWidth: number, clientWidth: number): PfeilLage {
  return {
    links: scrollLeft > TOLERANZ,
    rechts: scrollLeft + clientWidth < scrollWidth - TOLERANZ,
  }
}

/** Sprung eines Klicks in Pixeln: genau eine sichtbare Leistenbreite, links negativ. */
export function sprungVon(richtung: 'links' | 'rechts', clientWidth: number): number {
  return richtung === 'links' ? -clientWidth : clientWidth
}

/** Wird der Pfeil gezeigt (`sichtbar`) und ist er bedienbar (`aktiv`)? */
export function pfeilZustandVon(modus: PfeilModus, weitere: boolean): { sichtbar: boolean; aktiv: boolean } {
  return { sichtbar: modus === 'immer' || weitere, aktiv: weitere }
}
