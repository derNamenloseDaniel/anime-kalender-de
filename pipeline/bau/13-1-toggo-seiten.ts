import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import type { Title, WatchLink } from '../../shared/types.ts'
import { log, readJson, ROOT } from '../lib/util.ts'
import { ladeStaffelGrenzen, POKEMON_STAFFELN } from '../lib/pokemon-staffeln.ts'
import {
  istToggoAdresse,
  katalogAdresse,
  pokemonSeiten,
  serieFuerFigurLink,
  serienFuerTitelOhneWeg,
  staffelAdressen,
  toggoAdressArt,
  type KatalogSerie,
  type SeitenHand,
} from '../lib/toggo-seiten.ts'

export const TOGGO_SEITEN_HAND = resolve(ROOT, 'data/curated/toggo-seiten.yaml')

export type SeitenDaten = { katalog: KatalogSerie[]; hand: SeitenHand; staffeln: Map<number, number[]> }

/** Katalog (`data/toggo.json`), Handliste (`data/curated/toggo-seiten.yaml`) und die deutschen Staffeln der Pokémon-Hauptserie. */
export function ladeToggoSeiten(): SeitenDaten {
  const katalog = readJson<{ katalog?: KatalogSerie[] }>('data/toggo.json', {}).katalog ?? []
  const hand = (existsSync(TOGGO_SEITEN_HAND) ? yaml.load(readFileSync(TOGGO_SEITEN_HAND, 'utf8')) : null) as Partial<SeitenHand> | null
  const staffeln = new Map(ladeStaffelGrenzen(POKEMON_STAFFELN).map((t) => [t.anilistId, t.staffeln.map((s) => s.nr)]))
  return { katalog, hand: { pokemon: hand?.pokemon ?? [], titel: hand?.titel ?? [], falsch: hand?.falsch ?? [] }, staffeln }
}

/** `tg` der Detaildatei: je deutsche Staffel die Serienseite bei TOGGO (nur Titel der Pokémon-Hauptserie). */
export function toggoStaffelFeld(daten: SeitenDaten, id: number): { tg?: [number, string][] } {
  const seiten = pokemonSeiten(id, daten.staffeln.get(id) ?? [], daten.katalog, daten.hand.pokemon)
  return seiten.length ? { tg: staffelAdressen(seiten) } : {}
}

export type SeitenErgebnis = { ersetzt: number; angelegt: number; offen: string[] }

const namenVon = (t: Title) => [t.titleDe, t.titleEn, t.titleRomaji]
/** Ein neuer TOGGO-Weg: ohne freies Fenster nur im Abo (RTL+ über TOGGO). */
const neuerWeg = (url: string, frei: boolean): WatchLink => ({
  name: 'TOGGO',
  url,
  kind: 'stream',
  zugang: frei ? 'kostenlos' : 'abo',
})
function haengeAn(t: Title, url: string, frei: boolean): void {
  t.watchLinks = [...(t.watchLinks ?? []), neuerWeg(url, frei)]
}
const toggoWege = (t: Title): WatchLink[] => (t.watchLinks ?? []).filter((w) => istToggoAdresse(w.url))

/**
 * Jeder TOGGO-Weg zeigt auf die genaueste Seite: bei der Pokémon-Hauptserie auf die Serienseite der ersten Staffel des Titels (jede Staffel hat
 * bei TOGGO eine eigene), sonst auf die Serie, deren Name dem des Titels gleicht oder die die Handliste nennt. Filme und Folgen bleiben, was sie
 * sind; eine Figurenseite ohne Zuordnung bleibt stehen und steht in `offen` (der Bestandswächter zählt sie).
 */
export function loeseToggoSeiten(titel: Title[], daten: SeitenDaten, automatisch = false): SeitenErgebnis {
  const aus: SeitenErgebnis = { ersetzt: 0, angelegt: 0, offen: [] }
  for (const t of titel) {
    const falsch = daten.hand.falsch.filter((f) => f.id === t.id).map((f) => f.url)
    if (falsch.length && t.watchLinks) t.watchLinks = t.watchLinks.filter((w) => !falsch.includes(w.url))
    const staffelSeiten = pokemonSeiten(t.id, daten.staffeln.get(t.id) ?? [], daten.katalog, daten.hand.pokemon)
    const wege = toggoWege(t)
    if (staffelSeiten.length) {
      const erste = staffelSeiten[0]!.serie
      const url = katalogAdresse(erste)
      const betroffen = wege.filter((w) => ['figur', 'andere', 'serie'].includes(toggoAdressArt(w.url)))
      for (const w of betroffen) {
        if (w.url !== url) aus.ersetzt++
        w.url = url
      }
      if (!wege.length && erste.frei) {
        haengeAn(t, url, true)
        aus.angelegt++
      }
      continue
    }
    for (const w of wege) {
      if (toggoAdressArt(w.url) !== 'figur') continue
      const serie = serieFuerFigurLink(w.url, t.id, namenVon(t), daten.katalog, daten.hand.titel)
      if (!serie) {
        aus.offen.push(`${t.id} ${t.titleDe ?? t.titleEn ?? ''}: ${w.url}`)
        continue
      }
      w.url = katalogAdresse(serie, /toggo\.de\/([^/?#]+)/i.exec(w.url)?.[1]?.toLowerCase())
      aus.ersetzt++
    }
  }
  const ohneWeg = titel.filter((t) => !daten.staffeln.has(t.id) && !toggoWege(t).length)
  const alle = titel.map((t) => ({ id: t.id, namen: namenVon(t) }))
  const neu = serienFuerTitelOhneWeg(alle, new Set(ohneWeg.map((t) => t.id)), daten.katalog, daten.hand.titel, automatisch)
  for (const t of ohneWeg) {
    const s = neu.get(t.id)
    if (!s) continue
    haengeAn(t, katalogAdresse(s), s.frei)
    aus.angelegt++
  }
  return aus
}

/** `automatisch`: auch Titel ohne Weg bekommen die gleichnamige Serie (Cartoons; bei Anime legt `fetch-toggo` den Weg an). */
export function setzeToggoSeiten(titel: Title[], was: string, automatisch = false): void {
  const daten = ladeToggoSeiten()
  const e = loeseToggoSeiten(titel, daten, automatisch)
  if (e.ersetzt || e.angelegt) log(`TOGGO-Seiten (${was}): ${e.ersetzt} Adressen auf die Serienseite gesetzt, ${e.angelegt} Wege angelegt`)
  if (e.offen.length) log(`TOGGO-Seiten (${was}): ${e.offen.length} Figurenseite(n) ohne Serie: ${e.offen.join('; ')}`)
}
