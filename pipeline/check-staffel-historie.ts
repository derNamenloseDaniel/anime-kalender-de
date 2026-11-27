/**
 * Zusicherung: **eine Staffel aus einem Sammeltitel erbt dessen Gedächtnis** (`pipeline/lib/staffel-historie.ts`), sonst gälte sie am Tag der
 * Aktivierung als neu (Meldung „erstmals mit deutscher Synchro“, „Im Angebot seit“). Fixtures wie Horizonte: Sammeltitel 158871, Staffel 1 = 7000001.
 * Die Verdrahtung prüft kein Quelltext-Vergleich, sondern der echte Aufrufer: `baueNews` (Anbieter-Gedächtnis) und `schreibeNeuMitSynchro`
 * (`synchro-historie.json`, Wegwerf-Ordner über `AK_ROOT`) laufen mit einem Staffel-Titel und müssen den Tag des Sammeltitels übernehmen. Läuft in `check:logic`.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StreamLink, Title } from '../shared/types.ts'
import { geerbterAnbieterTag, geerbterSeitTag } from './lib/staffel-historie.ts'

/* `ROOT` (`lib/util.ts`) wird beim ersten Import festgelegt: Der Wegwerf-Ordner steht vor jedem Import der Bau-Module. */
const wurzel = mkdtempSync(join(tmpdir(), 'staffel-historie-'))
mkdirSync(join(wurzel, 'data'), { recursive: true })
for (const datei of ['ohne-synchro-von-hand.yaml', 'kino-ankuendigungen.yaml', 'fanservice-urteil.yaml']) copyFileSync(join(import.meta.dirname, '..', 'data', datei), join(wurzel, 'data', datei))
writeFileSync(join(wurzel, 'data', 'ankuendigungen.yaml'), 'eintraege: []\n')
process.env.AK_ROOT = wurzel
const { baueNews } = await import('./lib/news.ts')
const { schreibeNeuMitSynchro } = await import('./bau/nebendateien.ts')

let fehler = 0
let faelle = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  faelle++
  if (ok) return
  fehler++
  console.error(`✖ ${name}${info ? ` — ${info}` : ''}`)
}

const s1 = { id: 7000001, staffelTitel: { sammel: 158871, nr: 1, ab: 1 } }
const basis = { id: 158871, staffelTitel: { sammel: 158871, nr: 4, ab: 137 } }
const gewoehnlich = { id: 20 }
const seit = { 158871: '2026-08-13' }
const anbieter = { '158871:rtlplus': '2026-11-20', '158871:netflix': '0000-00-00' }

pruefe('Staffel erbt den Tag des Sammeltitels (seit)', geerbterSeitTag(seit, s1) === '2026-08-13')
pruefe('Basis-Staffel erbt nichts (seit)', geerbterSeitTag(seit, basis) === undefined)
pruefe('gewöhnlicher Titel erbt nichts (seit)', geerbterSeitTag(seit, gewoehnlich) === undefined)
pruefe('Sammeltitel ohne Eintrag: nichts zu erben (seit)', geerbterSeitTag({}, s1) === undefined)
pruefe('Staffel erbt den Tag je Anbieter', geerbterAnbieterTag(anbieter, s1, 'rtlplus') === '2026-11-20' && geerbterAnbieterTag(anbieter, s1, 'netflix') === '0000-00-00')
pruefe('Anbieter ohne Eintrag beim Sammeltitel: nichts zu erben', geerbterAnbieterTag(anbieter, s1, 'joyn') === undefined)
pruefe('Basis-Staffel erbt nichts (Anbieter)', geerbterAnbieterTag(anbieter, basis, 'rtlplus') === undefined)
pruefe('gewöhnlicher Titel erbt nichts (Anbieter)', geerbterAnbieterTag(anbieter, gewoehnlich, 'rtlplus') === undefined)

/* Verdrahtung 1: `baueNews` legt für den Staffel-Titel den Anbieter-Tag nicht mit heute, sondern mit dem Tag des Sammeltitels an. */
{
  const dub = { platform: 'rtlplus', url: 'https://plus.rtl.de/x', dub: true } as unknown as StreamLink
  const staffel = { id: 7000001, slug: 'h-1', titleEn: 'Horizonte 1', streams: [dub], keywords: [], genres: [], staffelTitel: { sammel: 158871, nr: 1, ab: 1 } } as unknown as Title
  const h = { zuerst: {}, anbieter: { '158871:rtlplus': '2026-11-20' } } as unknown as Parameters<typeof baueNews>[4]
  baueNews([staffel], [], [], [], h)
  pruefe('baueNews: neuer Anbieter-Schlüssel der Staffel nimmt den Tag des Sammeltitels', (h as { anbieter: Record<string, string> }).anbieter['7000001:rtlplus'] === '2026-11-20', JSON.stringify((h as { anbieter: unknown }).anbieter))
}

/* Verdrahtung 2: `schreibeNeuMitSynchro` trägt den Tag des Sammeltitels in `synchro-historie.json` und in die Neu-Liste ein. */
{
  try {
    mkdirSync(join(wurzel, 'public', 'data'), { recursive: true })
    writeFileSync(join(wurzel, 'data', 'synchro-historie.json'), JSON.stringify({ angelegtAm: '2000-01-01', seit: { 158871: '2999-06-01' } }))
    const mit = { id: 7000001, titleDe: 'Horizonte 1', slug: 'h-1', streams: [], hasVoices: true, staffelTitel: { sammel: 158871, nr: 1, ab: 1 } } as unknown as Title
    schreibeNeuMitSynchro([mit], [])
    const historie = JSON.parse(readFileSync(join(wurzel, 'data', 'synchro-historie.json'), 'utf8')) as { seit: Record<string, string> }
    const neu = JSON.parse(readFileSync(join(wurzel, 'public', 'data', 'neu-mit-synchro.json'), 'utf8')) as { id: number; seit: string }[]
    pruefe('schreibeNeuMitSynchro: seit-Eintrag der Staffel nimmt den Tag des Sammeltitels', historie.seit['7000001'] === '2999-06-01', JSON.stringify(historie.seit))
    pruefe('schreibeNeuMitSynchro: die Neu-Liste trägt denselben Tag', neu[0]?.seit === '2999-06-01', JSON.stringify(neu))
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

console.log(`check-staffel-historie: ${faelle} Fälle, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
