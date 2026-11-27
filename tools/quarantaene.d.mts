// Typen für die Helfer, die auch `pipeline/lib/quarantaene.ts` nutzt.
export interface QuarantaeneEintrag {
  titleId: number
  pruefung: string
  grund: string
}
export declare const MARKE: string
export declare const OBERGRENZE: number
export declare function markenZeile(titleId: number, pruefung: string, grund: string): string
export declare function liesMarken(text: string): QuarantaeneEintrag[]
export declare function entscheide(alt: QuarantaeneEintrag[], marken: QuarantaeneEintrag[]): { liste: QuarantaeneEintrag[]; sperre?: undefined } | { sperre: string; liste?: undefined }
export declare function warnText(liste: QuarantaeneEintrag[]): string
export declare const schuldigenPfad: (env: Record<string, string | undefined>) => string
export declare function schuldigeTitel(marken: QuarantaeneEintrag[], zurueckgestellt: QuarantaeneEintrag[]): QuarantaeneEintrag[]
export declare function main(args: string[], env?: Record<string, string | undefined>): number
