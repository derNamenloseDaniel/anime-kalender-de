/**
 * Zusicherung: **Netflix' Durchzählung gilt im Kalender** (26.11.2026, Steel Ball Run 2nd & 3rd STAGE: Folge 1 lief allein als eigener Titel,
 * der Folgen-Termin zählte ab 1, Netflix zeigte am 27.11. „Folge 11“ und endet am 04.12. mit Folge 12). Ein Release mit `firstEpisodeNumber: 2`
 * und 11 Terminen nummeriert 2 bis 12, das Finale ist Folge 12, und der Kasten spricht von 12, nicht von 11. Läuft in `check:logic`.
 */
import type { Release, Title } from '../shared/types.ts'
import { expandEvents } from '../shared/logic.ts'
import { istStaffelfinale, istStaffelstart } from '../shared/tv-signale.ts'
import { berechneAntwort } from '../web/src/components/detail/antwort-berechnen.ts'
import { folgenKopf } from '../web/src/components/detail/antwort-block.ts'

let fehler = 0
function pruefe(name: string, ok: boolean, info = ''): void {
  if (ok) return
  fehler++
  console.error(`FEHLER: ${name} ${info}`)
}

const t = (key: string, params?: Record<string, string | number>): string => (params ? `${key}${JSON.stringify(params)}` : key)

const release = (erste: number | undefined): Release =>
  ({
    slug: 'sbr',
    titleId: 1,
    name: 'Steel Ball Run – 2nd & 3rd STAGE',
    platform: 'netflix',
    platformUrl: 'https://www.netflix.com/title/82116553',
    releaseType: 'weekly',
    schedule: { firstEpisodeDate: '2026-09-25', episodeCount: 11, time: '10:00', ...(erste ? { firstEpisodeNumber: erste } : {}) },
    sources: [],
  }) as unknown as Release

const durchgezaehlt = release(2)
const data = { releaseBySlug: new Map([[durchgezaehlt.slug, durchgezaehlt]]) }
const termine = expandEvents(durchgezaehlt)
const am = (tag: string) => termine.find((e) => e.date === tag)

pruefe('25.09.: Folge 2 eröffnet den Teil', am('2026-09-25')?.episode === 2 && istStaffelstart(am('2026-09-25')!, data))
pruefe('27.11.: Folge 11, kein Finale', am('2026-11-27')?.episode === 11 && !istStaffelfinale(am('2026-11-27')!, data), JSON.stringify(am('2026-11-27')))
pruefe('04.12.: Folge 12 ist das Finale', am('2026-12-04')?.episode === 12 && istStaffelfinale(am('2026-12-04')!, data), JSON.stringify(am('2026-12-04')))
pruefe('Elf Termine bleiben elf', termine.length === 11, String(termine.length))
pruefe('Ohne Startnummer zählt der Termin ab 1 (Gegenprobe)', expandEvents(release(undefined)).at(-1)?.episode === 11)

/* Kasten am Vortag des Finales: die Titelzahl 11 (AniList) darf Folge 12 nicht verdecken. */
const titel = (episodes: number): Title => ({ id: 1, format: 'ONA', episodes, jpYear: 2026, streams: [] }) as unknown as Title
for (const zahl of [11, 12]) {
  const a = berechneAntwort({ title: titel(zahl), releases: [durchgezaehlt], today: '2026-12-03', jetzt: new Date('2026-12-03T12:00:00Z') })
  const kopf = a?.art === 'laeuft' ? folgenKopf(a, t) : undefined
  pruefe(`Titelzahl ${zahl}: Kasten nennt die Finalfolge 12`, kopf === 'antwort.finaleFolgeNr{"n":12}' || kopf === 'antwort.naechsteFolgeNr{"n":12}', String(kopf))
}

if (fehler) {
  console.error(`${fehler} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}
console.log('check-netflix-zaehlung: alle Prüfungen bestanden')
