/**
 * Grundlauf der Mutationsprobe `tools/mutationen/horizonte-staffeln.json`: baut aus den committeten Titeln und Terminen den Zustand
 * „Horizonte nach dem Staffel-Schnitt“ und schreibt die Folgenlisten (`schreibeFolgenDateien`) nach `public/data/folgen`. Grün auch vor dem
 * ersten Bestandsbau mit den Staffel-Titeln: Steht der Schnitt schon in `titles.json`, wird er zuvor zum Sammeltitel zurückgeführt.
 * Schreibt im Arbeitsordner (Wegwerf-Kopie der Probe, nicht in den Betrieb).
 */
import type { Release, Title } from '../../shared/types.ts'
import { schreibeFolgenDateien } from '../bau/folgen-dateien.ts'
import { teileStaffelTitel } from '../bau/staffel-titel.ts'
import { ladeStaffelGrenzen } from './pokemon-staffeln.ts'
import { staffelPlaene } from './staffel-titel.ts'
import { readJson } from './util.ts'

const SAMMEL = 158871

const titelListe = readJson<Title[] | { titles: Title[] }>('public/data/titles.json', [])
const releasesListe = readJson<Release[] | { releases: Release[] }>('public/data/releases.json', [])
const alle = Array.isArray(titelListe) ? titelListe : titelListe.titles
const termine = Array.isArray(releasesListe) ? releasesListe : releasesListe.releases

const plaene = staffelPlaene(ladeStaffelGrenzen()).filter((p) => p.sammel === SAMMEL)
const kennungen = new Set(plaene.flatMap((p) => p.staffeln.map((s) => s.kennung)))
/* Vorher-Zustand: Staffel-Titel zurück auf den Sammeltitel (nur nötig, wenn der Bestand sie schon trägt). */
const titel = new Map(alle.filter((t) => t.id === SAMMEL || !kennungen.has(t.id)).map((t) => [t.id, t.id === SAMMEL ? ({ ...t, staffelTitel: undefined } as Title) : t]))
const releases = termine.map((r) => (kennungen.has(r.titleId) ? { ...r, titleId: SAMMEL } : r))

const sammel = teileStaffelTitel({ titles: titel, releases, events: [] }, { plaene, sendungen: [], wiki: {} })
schreibeFolgenDateien([...titel.values()], releases, sammel)
