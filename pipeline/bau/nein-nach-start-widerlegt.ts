import { log } from '../lib/util.ts'
import { PLATFORMS, type Release } from '../../shared/types.ts'
import type { DubCheck } from '../lib/dub-confirmed.ts'

type Beleg = Pick<DubCheck, 'anilistId' | 'platform' | 'url' | 'dub' | 'kanalOhneBeleg' | 'juengstesUrteil'> & { checkedAt?: string }

/**
 * **Ein Handbeleg „nur Originalton“, gemessen am angekündigten Starttag oder danach, widerlegt den deutschen Start** (27.11.2026,
 * The Most Heretical Last Boss Queen 156040: Anime2You kündigte die Aniverse-Synchro für den 26.11. an, Amazon führte am 26.11. nur
 * 日本語). Vor dem Start ist das Nein offen (`nein-sprache-offen.ts`), ab dem Tag ist der angekündigte Ton ausgeblieben. Der Termin
 * bleibt im Datensatz mit Grund (`widerlegt`), nur nicht im Kalender. Ein späteres Ja oder ein Kanal-Nein ohne Beleg hebt das auf.
 */
export function widerlegeNeinNachStart(releases: Release[], belege: Beleg[]): string[] {
  const getroffen: string[] = []
  for (const r of releases) {
    const ab = r.schedule?.firstEpisodeDate
    if (r.sprache !== 'offen' || !r.automatisch || r.widerlegt || !ab) continue
    const hier = belege.filter((b) => b.anilistId === r.titleId && b.platform === r.platform)
    const nein = hier
      .filter((b) => b.dub === false && !b.kanalOhneBeleg && b.juengstesUrteil !== 'ja' && (b.checkedAt ?? '') >= ab)
      .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''))[0]
    if (!nein || hier.some((b) => b.dub === true && !b.kanalOhneBeleg && (b.checkedAt ?? '') >= (nein.checkedAt ?? ''))) continue
    r.widerlegt = {
      am: ab,
      grund: `${PLATFORMS[r.platform]?.name ?? r.platform} führt am ${nein.checkedAt} nur den Originalton, keine deutsche Tonspur.`,
      ...(nein.url ? { quelle: nein.url } : {}),
      anbieter: r.kanal ? `${PLATFORMS[r.platform]?.name ?? r.platform} (${r.kanal})` : (PLATFORMS[r.platform]?.name ?? r.platform),
      gemeldet: true,
    }
    getroffen.push(r.slug)
  }
  if (getroffen.length) log(`${getroffen.length} deutsche Termine durch einen Handbeleg nach dem Starttag widerlegt: ${getroffen.join(', ')}`)
  return getroffen
}
