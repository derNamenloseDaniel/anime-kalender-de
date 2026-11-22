/**
 * Kulisse für `check-staffel-titel-termine.ts`: fährt die Phase Staffel-Titel mit ihrem echten Ladeweg (`ladeStaffelEingaben`, Vorgabe-Parameter)
 * gegen `AK_ROOT` (Yaml, `data/tv-programm.json`, `data/wikipedia-folgen.json` legt der Test an) und druckt das Ergebnis als JSON.
 */
import type { Release, ReleaseEvent, Title } from '../../shared/types.ts'
import { ladeStaffelEingaben, teileStaffelTitel } from '../bau/staffel-titel.ts'

const titel = { id: 158871, titleDe: 'Pokémon Horizonte', genres: [], keywords: [] } as unknown as Title
const release = { slug: 'auto-158871-tv-super-rtl', titleId: 158871, name: 'Pokémon Horizonte', platform: 'tv', sender: 'Super RTL', releaseType: 'weekly', schedule: { firstEpisodeDate: '2026-09-16' } } as unknown as Release
const termin = { id: 'auto-158871-tv-super-rtl@2026-09-16', releaseSlug: release.slug, titleId: 158871, date: '2026-09-16', time: '16:05', episode: 1, platform: 'tv', sender: 'Super RTL', sichtung: true, releaseType: 'weekly', name: 'x' } as ReleaseEvent
const bau = { titles: new Map([[158871, titel]]), releases: [release], events: [termin] }
const eingaben = ladeStaffelEingaben()
const sammel = teileStaffelTitel(bau)
console.log(
  JSON.stringify({
    plaene: eingaben.plaene.map((p) => p.staffeln.map((s) => s.kennung)),
    sendungen: eingaben.sendungen.length,
    wiki: Object.keys(eingaben.wiki),
    sammel: sammel.map((s) => s.plan.sammel),
    termin: bau.events.map((e) => [e.titleId, e.episode]),
  }),
)
