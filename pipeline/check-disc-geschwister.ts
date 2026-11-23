/**
 * Disc-Termin an angekündigter Staffel (23.11.2026): „2.5 Dimensional Seduction – Vol. 4" hing über die AniList-Suche an der
 * 2nd Season (185515, noch nicht erschienen), obwohl aniSearch „Vol. 4/4" bei Staffel 1 (158559) führt. Die Kennungen unten
 * sind Platzhalter ab 900000.
 */
import type { Release, Title } from '../shared/types.ts'
import type { DiscAusgabe } from './lib/disc-termin.ts'
import { discAufGeschwisterUmhaengen } from './lib/disc-geschwister.ts'

let fehler = 0
function pruefe(name: string, bedingung: boolean, gefunden?: unknown): void {
  if (bedingung) return void console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const titel = (id: number, franchiseId: number): Title => ({ id, franchiseId, format: 'TV' }) as unknown as Title
const karte = (...t: Title[]) => new Map(t.map((x) => [x.id, x]))
const disc = (titleId: number, name: string, datum = '2026-11-20'): Release =>
  ({ slug: `${name}-${titleId}`, titleId, name, platform: 'disc', releaseType: 'disc', schedule: { firstEpisodeDate: datum }, sources: ['https://x'] }) as unknown as Release
const aus = (edition: string, datum: string): DiscAusgabe => ({ edition, kurz: edition, datum, url: 'https://www.anisearch.de/article/1' })

const S1 = 900001
const S2 = 900002
const FREMD = 900003
const fruehe = karte(titel(S1, 7), titel(S2, 7), titel(FREMD, 8))
const index = {
  [S1]: [aus('Vol. 1/4', '2026-03-06'), aus('Vol. 4/4', '2026-09-04')],
  [FREMD]: [aus('Vol. 4/4', '2026-09-04')],
}

{
  const rs = [disc(S2, 'Ririsa – Vol. 4')]
  const g = discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('Vol. 4 ohne eigene Ausgabe hängt an der Staffel, die sie führt', rs[0]!.titleId === S1 && g.length === 1, rs[0]!.titleId)
}
{
  const rs = [disc(S1, 'Ririsa – Vol. 4')]
  discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('führt der eigene Titel die Nummer, bleibt sie dort', rs[0]!.titleId === S1)
}
{
  const rs = [disc(S2, 'Ririsa – Vol. 3')]
  discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('keine Ausgabe mit dieser Nummer bei den Geschwistern: unverändert', rs[0]!.titleId === S2)
}
{
  const rs = [disc(S2, 'Ririsa – Vol. 4')]
  const mehr = karte(titel(S1, 7), titel(S2, 7), titel(S2 + 10, 7))
  discAufGeschwisterUmhaengen(rs, mehr, { ...index, [S2 + 10]: [aus('Vol. 4/4', '2026-09-04')] })
  pruefe('zwei Geschwister führen die Nummer: unverändert (mehrdeutig)', rs[0]!.titleId === S2, rs[0]!.titleId)
}
{
  const rs = [disc(FREMD, 'Anderes – Vol. 4'), disc(S2, 'Ririsa – Vol. 4', '2026-11-20')]
  discAufGeschwisterUmhaengen(rs, fruehe, { [S1]: [aus('Vol. 4/4', '2024-01-05')] })
  pruefe('Ausgabe von vor über 400 Tagen ist eine andere Ware', rs[1]!.titleId === S2, rs[1]!.titleId)
}
{
  const rs = [disc(S2, 'Ririsa – Staffel 2 – Vol. 4')]
  discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('andere Staffelangabe ist keine Ausgabe derselben Ware', rs[0]!.titleId === S2, rs[0]!.titleId)
}
{
  const rs: Release[] = [{ ...disc(S2, 'Ririsa – Vol. 4'), releaseType: 'weekly' } as Release, disc(S2, 'Ririsa')]
  discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('Nicht-Disc und Disc ohne Nummer bleiben', rs[0]!.titleId === S2 && rs[1]!.titleId === S2)
}
{
  const rs = [disc(S2, 'Ririsa – Vol. 4'), disc(FREMD, 'Anderes – Vol. 4')]
  discAufGeschwisterUmhaengen(rs, fruehe, index)
  pruefe('nur der Treffer wandert, ein Titel anderer Franchise bleibt', rs[0]!.titleId === S1 && rs[1]!.titleId === FREMD)
}

if (fehler) {
  console.error(`${fehler} Fehler`)
  process.exit(1)
}
console.log('Disc-Geschwister: alle Fälle grün')
