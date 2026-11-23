import { PLATFORMS, type PlatformId } from './types.ts'

/** Nur diese Verlagsnamen aus aniSearch sind eindeutig ein Streaming-Anbieter; „Crunchyroll" bleibt hier mehrdeutig, zählt aber nie als Disc-Verlag (`KEIN_DISC_VERLAG`). */
export const ANBIETER_VON_VERLAG: Record<string, PlatformId> = {
  'Amazon.com, Inc.': 'primevideo',
  'Netflix, Inc.': 'netflix',
  'The Walt Disney Company': 'disneyplus',
}

/**
 * Ist der Verlag der aniSearch-Erstausgabe dieser Anbieter? Entweder steht er in der Tabelle („Amazon.com, Inc." ist Prime Video,
 * „The Walt Disney Company" ist Disney+) oder sein Name trägt den des Anbieters („Netflix, Inc.", „Crunchyroll", „Disney+").
 * „Kazé" ist nicht Crunchyroll und „Walt Disney Studios Motion Pictures" nicht Disney+.
 */
export function verlagIstAnbieter(publisher: string | undefined, platform: PlatformId): boolean {
  if (!publisher) return false
  return ANBIETER_VON_VERLAG[publisher] === platform || publisher.toLowerCase().includes((PLATFORMS[platform]?.name ?? '§').toLowerCase())
}

/** Verlage der Erstausgabe, die keine Discs herausgeben: Streaming-Dienste, Fernsehsender, Kino-Verleih (Messung 23.11.2026 an den Verlagsnamen in `titles.json`). */
const KEIN_DISC_VERLAG = /netflix|crunchyroll|disney\+|disney channel|amazon|prime video|hbo|wakanim|myvideo|viewster|joyn|rtl\+|pluto|youtube|paramount\+|aniverse|\bADN\b|\bARD\b|\bZDF\b|sat\.1|kabel 1|\bVOX\b|super rtl|prosieben|jetix|fox kids|nickelodeon|\(kino\)|motion pictures|premiere\)/i

/**
 * Zählt die aniSearch-Erstausgabe als Disc-Weg (Daniel, F156 A, 23.11.2026)? Ja, wenn ein Verlag genannt ist, der Discs herausgibt;
 * ohne Verlag oder bei Streaming-Dienst, Sender und Kino-Verleih nicht — dann behauptet die Erstausgabe keinen Disc-Weg.
 * Die eine Regel für Weg-Filter (`wegeVon`) und damit Chip-Zahlen.
 */
export function erstausgabeIstDiscWeg(e: { publisher?: string } | undefined): boolean {
  return !!e?.publisher && !KEIN_DISC_VERLAG.test(e.publisher) && !(e.publisher in ANBIETER_VON_VERLAG)
}
