/**
 * **Handzuordnungen TMDB → Titel gegen AniList** (`data/tmdb-von-hand.yaml`): je Zuordnung Name, Startdatum und Folgenzahl
 * der TMDB-Seite gegen die AniList-Werte des Titels. Eine Handzeile veraltet still; dieses Werkzeug macht das messbar.
 * Es liest nur Dateien im Repo (keine Netzabrufe) und korrigiert nichts.
 *
 * TMDB-Seite: Folgen aus `data/tmdb-folgen.json` (Schlüssel AniList-Kennung, gesucht wird über die TMDB-Kennung, weil
 * spätere Staffeln unter dem Titel der ersten stehen), Name aus `data/tmdb-titles.json`. Die Staffel ist die mit dem
 * Starttag am nächsten am AniList-Start. AniList-Seite: Romaji, Englisch, Original aus `public/data/titles.json` (auch die
 * der Reihe, weil TMDB die Serie unter deren Namen führt; `titleDe` nicht, er stammt teils von TMDB), Start und Folgenzahl
 * aus `public/data/franchises.json`. TMDBs Name ist der deutsche: ein Name ohne Treffer kann auch nur übersetzt sein.
 *
 * Abrufdatum: jede Abweichung nennt den Stand ihrer TMDB-Quelle (`geholtAm` in `tmdb-folgen.json` für Startdatum/Folgenzahl
 * der Serie, `fetchedAt` in `tmdb-titles.json` für Name und Filmjahr) und ihr Alter in Tagen gegen den Bau-Stand; ab
 * `ALT_TAGE` heißt der Stand „alt“ (die Abweichung kann an einem überholten Abruf liegen), ohne Datum „unbekannt“.
 *
 * Aufruf: node tools/tmdb-abgleich.mjs [--json]
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from 'yaml'

const WURZEL = join(fileURLToPath(import.meta.url), '..', '..')
export const FELDER = ['Name', 'Startdatum', 'Folgenzahl']
/** Ab so vielen Tagen zwischen Abruf und Bau-Stand gilt ein TMDB-Bestand als alt (laufende Serien holt der Sammler nach 6 Tagen neu). */
export const ALT_TAGE = 7

const tage = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000)
export const normName = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/** Stand einer Quelle: Abrufdatum (`YYYY-MM-DD`), Alter in Tagen gegen `bezug` und Urteil frisch/alt/unbekannt. */
export function standVon(abruf, bezug) {
  const tag = String(abruf ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || !bezug) return { abruf: null, alterTage: null, urteil: 'unbekannt' }
  const alterTage = tage(String(bezug).slice(0, 10), tag)
  return { abruf: tag, alterTage, urteil: alterTage >= ALT_TAGE ? 'alt' : 'frisch' }
}

export function standText(s) {
  return s.urteil === 'unbekannt' ? 'TMDB-Stand: Alter unbekannt' : `TMDB-Stand ${s.abruf} (${s.alterTage} Tage, ${s.urteil})`
}

/** Der TMDB-Name stimmt, wenn er (normalisiert) in einem AniList-Namen steckt: Serienname ⊆ „Serienname Staffel 2“. */
export function nameStimmt(tmdbName, anilistNamen) {
  const n = normName(tmdbName)
  return n.length > 0 && anilistNamen.some((a) => normName(a).includes(n))
}

/** TMDB-Staffeln (ohne Staffel 0) mit Starttag und Folgenzahl, aufsteigend. */
export function staffelnAus(folgen) {
  const je = new Map()
  for (const f of folgen) {
    if (!(f.s >= 1)) continue
    const s = je.get(f.s) ?? { s: f.s, start: null, folgen: 0 }
    s.folgen++
    if (f.datum && (!s.start || f.datum < s.start)) s.start = f.datum
    je.set(f.s, s)
  }
  return [...je.values()].sort((a, b) => a.s - b.s)
}

/** Die TMDB-Staffel, deren Starttag am nächsten am AniList-Start liegt. */
export function waehleStaffel(staffeln, jpStart) {
  const datiert = staffeln.filter((s) => s.start)
  if (!jpStart || !datiert.length) return undefined
  return datiert.reduce((b, s) => (Math.abs(tage(s.start, jpStart)) < Math.abs(tage(b.start, jpStart)) ? s : b))
}

function anilistSeite(id, d) {
  const t = d.titel.get(id)
  const fr = d.franchiseEintrag.get(id)
  const wurzel = t?.franchiseId ? d.titel.get(t.franchiseId) : undefined
  const namen = [t, wurzel].flatMap((x) => (x ? [x.titleRomaji, x.titleEn, x.titleNative] : []))
  return { namen: namen.filter(Boolean), start: fr?.jpStart, episoden: fr?.episodes ?? t?.episodes, anzeige: t?.titleDe ?? fr?.name }
}

function tmdbSeite(e, d) {
  const kandidaten = Object.entries(d.tmdbFolgen).filter(([, v]) => v.tmdbId === e.tmdbId)
  const folgen = kandidaten.sort(([, a], [, b]) => (b.geholtAm ?? '').localeCompare(a.geholtAm ?? ''))[0]?.[1]
  const eigen = d.tmdbTitel[e.anilistId]
  const eigener = eigen?.tmdbId === e.tmdbId ? eigen : undefined
  const nameQuelle = (eigener?.nameDe && eigener) || Object.values(d.tmdbTitel).find((v) => v.tmdbId === e.tmdbId && v.nameDe)
  return { folgen, name: nameQuelle?.nameDe, jahr: eigener?.jahr, folgenStand: folgen?.geholtAm, titelStand: eigener?.fetchedAt, nameStand: nameQuelle?.fetchedAt }
}

/** Eine Handzuordnung → Abweichungen und nicht prüfbare Felder. */
export function pruefeZuordnung(e, d) {
  const a = anilistSeite(e.anilistId, d)
  const t = tmdbSeite(e, d)
  const titel = `${a.anzeige ?? e.titel} (AniList ${e.anilistId}, TMDB ${e.tmdbId})`
  const abw = []
  const offen = []
  const melde = (feld, tmdb, anilist, staffel, abruf) => abw.push({ anilistId: e.anilistId, tmdbId: e.tmdbId, titel, feld, tmdb, anilist, ...(staffel ? { staffel } : {}), stand: standVon(abruf, d.stand) })

  if (t.name) { if (!nameStimmt(t.name, a.namen)) melde('Name', t.name, a.namen[0] ?? '–', undefined, t.nameStand) }
  else offen.push('Name')

  const wahl = e.kind === 'tv' && t.folgen ? waehleStaffel(staffelnAus(t.folgen.folgen), a.start) : undefined
  const staffel = wahl && `Staffel ${wahl.s}`
  if (wahl) { if (wahl.start !== a.start) melde('Startdatum', wahl.start, a.start, staffel, t.folgenStand) }
  else if (e.kind === 'movie' && t.jahr && a.start) { if (String(t.jahr) !== a.start.slice(0, 4)) melde('Startdatum', String(t.jahr), a.start, undefined, t.titelStand) }
  else offen.push('Startdatum')

  if (wahl && a.episoden) { if (wahl.folgen !== a.episoden) melde('Folgenzahl', wahl.folgen, a.episoden, staffel, t.folgenStand) }
  else if (e.kind === 'movie' && a.episoden) { if (a.episoden !== 1) melde('Folgenzahl', 1, a.episoden, undefined, t.titelStand) }
  else offen.push('Folgenzahl')

  return { abweichungen: abw, offen }
}

/** Alle Handzuordnungen (ohne `ohne: true`, die keine Kennung tragen). */
export function abgleich(d) {
  const zuordnungen = d.hand.filter((e) => !e.ohne && e.tmdbId)
  const geprueft = Object.fromEntries(FELDER.map((f) => [f, 0]))
  const abweichungen = []
  const nichtPruefbar = []
  for (const e of zuordnungen) {
    const r = pruefeZuordnung(e, d)
    abweichungen.push(...r.abweichungen)
    for (const f of FELDER) if (!r.offen.includes(f)) geprueft[f]++
    if (r.offen.length) nichtPruefbar.push({ anilistId: e.anilistId, titel: e.titel, felder: r.offen })
  }
  return { zuordnungen: zuordnungen.length, geprueft, abweichungen, nichtPruefbar }
}

export function ladeDaten(wurzel = WURZEL) {
  const json = (p) => JSON.parse(readFileSync(join(wurzel, p), 'utf8'))
  const franchiseEintrag = new Map()
  for (const liste of Object.values(json('public/data/franchises.json'))) for (const f of liste) franchiseEintrag.set(f.id, f)
  return {
    hand: parse(readFileSync(join(wurzel, 'data/tmdb-von-hand.yaml'), 'utf8')) ?? [],
    tmdbTitel: json('data/tmdb-titles.json'),
    tmdbFolgen: json('data/tmdb-folgen.json'),
    titel: new Map(json('public/data/titles.json').map((t) => [t.id, t])),
    franchiseEintrag,
    stand: json('public/data/meta.json').generatedAt,
  }
}

function drucke(r, stand) {
  console.log(`Datenstand: Bau ${stand}; ${r.zuordnungen} Handzuordnungen mit TMDB-Kennung`)
  for (const f of FELDER) console.log(`  ${f}: ${r.geprueft[f]} geprüft, ${r.abweichungen.filter((a) => a.feld === f).length} Abweichungen`)
  console.log('\nAbweichungen (Titel | Feld | TMDB | AniList | TMDB-Abruf)')
  for (const a of r.abweichungen) console.log(`  ${a.titel} | ${a.feld}${a.staffel ? ` (${a.staffel})` : ''} | ${a.tmdb} | ${a.anilist} | ${standText(a.stand)}`)
  console.log('\nNicht prüfbar (keine TMDB-Daten im Repo)')
  for (const n of r.nichtPruefbar) console.log(`  ${n.titel} (AniList ${n.anilistId}): ${n.felder.join(', ')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const d = ladeDaten()
  const r = abgleich(d)
  if (process.argv.includes('--json')) console.log(JSON.stringify({ stand: d.stand, ...r }, null, 2))
  else drucke(r, d.stand)
}
