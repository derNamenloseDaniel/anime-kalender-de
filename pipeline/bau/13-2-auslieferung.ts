import { pruefeVerlust } from './verlust-riegel.ts'
import { anisearchKennungen } from './anisearch-kennung.ts'
import { schreibeKern } from './cartoon-kern.ts'
import { kinoFeld, type EntfernterVerweis } from './grundlagen.ts'
import { schreibeVerweiseGedaechtnis } from './verweise-schreiben.ts'
import { type Title, type Release } from '../../shared/types.ts'
import { synopseVon } from './synopse-von.ts'
import { archivTexte } from '../lib/anisearch-archiv-text.ts'
import { type AnisearchEintrag, type TmdbTitelEintrag } from './01-quellen.ts'
import { type SynopsisEintrag } from './13-1-anreichern.ts'
import { lesekennung } from '../../shared/staffel-titel.ts'

/** Ein Titel, wie er ausgeliefert wird (`titles.json`). */
export type SlimTitel = ReturnType<typeof baueAuslieferung>['slim'][number]

/** Was `slimTitel` je Titel aus den Quellen nachschlägt. */
interface SlimKontext {
  anisearch: Record<string, AnisearchEintrag>
  tmdbTitles: Record<string, TmdbTitelEintrag>
  trenneQuelle: (text: string) => { text: string; url?: string; }
  synopses: Record<number, SynopsisEintrag>
  mitStimmen: Set<number>
  annKennungen: Record<string, number>
  trailer: Record<string, { video: string; titel: string; sprache?: 'de' | 'en' | 'ja'; }>
  kennungen: ReturnType<typeof anisearchKennungen>
  archiv: ReturnType<typeof archivTexte>
}

/** Der Trailer-Block des Titels, falls einer belegt ist. */
function trailerFeld(q: number, trailer: SlimKontext['trailer']) {
  const eintrag = trailer[String(q)]
  if (!eintrag) return {}
  return {
    trailer: {
      video: eintrag.video,
      titel: eintrag.titel,
      /* Ältere Einträge kannten das Feld nicht — sie stammen aus der deutschen Erstfassung. */
      sprache: eintrag.sprache ?? ('de' as const),
    },
  }
}

/** Ein Titel in Auslieferungsform; legt nebenbei seine Synopse in `synopses` ab. */
function slimTitel(t: Title, k: SlimKontext) {
  const q = lesekennung(t)
  const ausAnisearch = k.anisearch[q]?.descriptionDe ?? k.archiv.get(q)
  const ausTmdb = k.tmdbTitles[q]
  const asId = k.kennungen.get(q)
  const synopse = synopseVon({ t, asId, ausAnisearch, ausTmdb, trenneQuelle: k.trenneQuelle })
  if (synopse) k.synopses[t.id] = synopse
  const { synopsis: _drop, jpStartTag: _jpStart, ...rest } = t
  /*
    **Die Kennungen der Quellen gehören an den Titel.**

    Sie kosten je Titel wenige Bytes und beantworten eine Frage, die die
    Quellenübersicht sonst offen lässt: „und wo steht das?". aniSearch führt
    den deutschen Titel und die Beschreibung, ANN die deutschen Sprechrollen —
    beide Kennungen lagen im Bestand und erreichten die Seite nie.

    `annId` nur, wo auch Stimmen belegt sind: Ohne sie führt der Verweis auf
    eine Seite, die zu unserer Frage nichts sagt.
  */
  const annId = k.mitStimmen.has(q) ? k.annKennungen[String(q)] : undefined
  return {
    ...rest,
    ...(k.mitStimmen.has(q) ? { hasVoices: true as const } : {}),
    ...(Number.isFinite(asId) ? { anisearchId: asId } : {}),
    ...(Number.isFinite(annId) ? { annId } : {}),
    /* Nur die beiden Felder, die die Oberfläche braucht — Herkunft und Prüfdatum bleiben in der Quelle. */
    ...trailerFeld(q, k.trailer),
    ...kinoFeld(t.id),
  }
}

export function baueAuslieferung({
  allTitles,
  anisearch,
  tmdbTitles,
  trenneQuelle,
  synopses,
  mitStimmen,
  annKennungen,
  trailer,
  releases,
  verschoben,
  verweiseEntfernt,
}: {
  allTitles: Title[]
  anisearch: Record<string, AnisearchEintrag>
  tmdbTitles: Record<string, TmdbTitelEintrag>
  trenneQuelle: (text: string) => { text: string; url?: string; }
  synopses: Record<number, SynopsisEintrag>
  mitStimmen: Set<number>
  annKennungen: Record<string, number>
  trailer: Record<string, { video: string; titel: string; sprache?: 'de' | 'en' | 'ja'; }>
  releases: Release[]
  verschoben: Title[]
  verweiseEntfernt: EntfernterVerweis[]
}) {
  const kennungen = anisearchKennungen(allTitles.map((t) => ({ id: t.id, mal: t.malId })))
  const archiv = archivTexte(kennungen, (id) => !!anisearch[id]?.descriptionDe || !!tmdbTitles[id]?.overviewDe)
  const kontext: SlimKontext = { anisearch, tmdbTitles, trenneQuelle, synopses, mitStimmen, annKennungen, trailer, kennungen, archiv }
  const slim = allTitles.map((t) => slimTitel(t, kontext))

  // Der Kalender braucht nur die Titel, zu denen es einen Termin gibt. Die
  // vollständige Liste (mehrere Megabyte) lädt erst die Datenbank-Ansicht nach.
  const referenced = new Set(releases.map((r) => r.titleId))
  schreibeKern(slim, referenced)
  pruefeVerlust(slim, verschoben)

  /*
    **Das Gedächtnis wird erst geschrieben, wenn der Lauf gültig ist.**

    `data/verweise-entfernt.json` hält fest, was frühere Läufe als belegtes Nein
    entfernt haben — ohne diese Datei legt der nächste Bau alles wieder an. Sie
    stand bis zum 06.09.2026 rund 430 Zeilen weiter oben, also **vor** dem
    Riegel darüber. Ein lokaler Lauf mit älterem `data/cache/` brach dort ab
    („2 Titel würden aus dem Datensatz fallen") — und die Datei war da bereits
    von 782 Zeilen auf zwei geschrumpft, weil dieser Lauf weniger entfernte
    Verweise gesehen hatte.

    Gefangen hat es `git status` vor dem Commit. Ein Riegel, der den Datensatz
    schützt und die Nebendatei daneben unbeschädigt lässt, schützt aber nur die
    Hälfte: Wer den Diff nicht durchsieht, committet ein leeres Gedächtnis.
  */
  /*
    **Was das Gedächtnis gesperrt hat, schreibt es auch wieder mit.**

    Bis zum 17.09.2026 enthielt die Datei nur, was **dieser** Lauf entfernt hat.
    Ein Verweis, den aniSearch ergänzt und der Bau als belegtes Nein wieder
    entfernt, stand danach drin — der nächste Lauf ergänzte ihn deshalb nicht,
    entfernte ihn also auch nicht, und schrieb ihn nicht mehr. Der übernächste
    legte ihn wieder an. 78 Crunchyroll-Adressen (One Piece, DearS …) flatterten
    so von Bau zu Bau, sichtbar in `data/bestand-historie.jsonl` als 836 ↔ 769.
    Übernommen wird ein alter Eintrag, solange seine Frist läuft, dieser Lauf
    ihn nicht selbst neu geschrieben hat und kein Verweis mit dieser Adresse im
    Datensatz steht.
  */
  schreibeVerweiseGedaechtnis(allTitles, verweiseEntfernt)
  return { slim }
}
