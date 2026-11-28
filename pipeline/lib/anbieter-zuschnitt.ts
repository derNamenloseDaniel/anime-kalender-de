/**
 * **Der Zuschnitt des Anbieters als Anzeigefeld** (Konzept `daniel-zum-abarbeiten/berichte/konzept-staffel-zuschnitt.md`, Ansatz A).
 *
 * Netflix führt manchmal als eine Staffel, was wir als mehrere Titel führen (Stone Ocean: 12 + 26 Folgen gegen eine Staffel mit 38).
 * `data/curated/anbieter-zuschnitt.yaml` nennt je Fall die Netflix-Staffel und unsere Glieder; hier wird jeder Eintrag gegen
 * `data/anbieter-staffeln.json` gehalten und trägt nur dann `FranchiseMember.anbieterStaffel`, wenn er **Position für Position**
 * aufgeht (wie `netflix-staffeln.ts`): unsere Folgen vor den Gliedern = Netflix' Folgen vor der Staffel, Summe der Glieder = Folgen
 * der Staffel. Kennungen, Titel und Kalender bleiben unberührt; die Nummer ist die der Reihe, vom Anbieter kommen nur die Grenzen.
 */
import { ausstrahlungsZeit } from '../../shared/titles.ts'
import { staffelStandVon } from '../../shared/staffel-zaehlung.ts'
import type { AnbieterZuschnitt, FranchiseMember } from '../../shared/franchise-typ.ts'
import type { Title } from '../../shared/types.ts'
import { netflixFolgenliste, type StaffelListen } from './netflix-staffeln.ts'

export type ZuschnittEintrag = { url: string; staffel: number; glieder: number[]; quelle: string; datum: string }
export type ZuschnittTitel = Pick<Title, 'id' | 'episodes' | 'format' | 'jpYear' | 'jpStart' | 'streams'>
export type Abweichung = { url: string; staffel: number; grund: string }
export type ZuschnittErgebnis = { gesetzt: number; abweichungen: Abweichung[] }
type Teil = Pick<AnbieterZuschnitt, 'teil' | 'von' | 'bis'>

const NETFLIX_KENNUNG = /netflix\.com\/(?:[a-z-]+\/)?title\/(\d+)/i
const KEINE_SERIE = new Set(['MOVIE', 'MUSIC'])

export function netflixKennung(url: string | undefined): string | undefined {
  return url ? NETFLIX_KENNUNG.exec(url)?.[1] : undefined
}

/** Unsere Titel an einer Netflix-Adresse in Reihenfolge der Ausstrahlung (ohne Filme und Musik; Specials und OVA zählt Netflix im Menü mit). */
export function titelAnAdresse(kennung: string, titel: ZuschnittTitel[]): ZuschnittTitel[] {
  return titel
    .filter((t) => !KEINE_SERIE.has(String(t.format ?? '')))
    .filter((t) => (t.streams ?? []).some((s) => netflixKennung(s.url) === kennung || netflixKennung(s.seite) === kennung))
    .sort((a, b) => ausstrahlungsZeit(a).localeCompare(ausstrahlungsZeit(b)) || a.id - b.id)
}

const summe = (zahlen: number[]): number => zahlen.reduce((s, n) => s + n, 0)

/** Teil, Start und Ende je Glied einer Anbieter-Staffel, oder der Grund, warum der Eintrag nicht aufgeht. */
export function zuschneide(e: ZuschnittEintrag, listen: StaffelListen, titel: ZuschnittTitel[]): Map<number, Teil> | string {
  const kennung = netflixKennung(e.url)
  const folgen = kennung ? netflixFolgenliste(e.url, listen) : null
  if (!kennung || !folgen) return 'keine lückenlose Netflix-Staffelliste'
  const ziel = folgen[e.staffel - 1]
  if (ziel === undefined) return `Netflix kennt keine Staffel ${e.staffel} (${folgen.length} Staffeln)`
  if (e.glieder.length < 2) return 'weniger als zwei Glieder'
  const an = titelAnAdresse(kennung, titel)
  if (an.some((t) => !t.episodes)) return `Folgenzahl fehlt bei ${an.filter((t) => !t.episodes).map((t) => t.id).join(', ')}`
  const platz = e.glieder.map((g) => an.findIndex((t) => t.id === g))
  if (platz.some((p, i) => p < 0 || p !== platz[0]! + i)) return `Glieder ${e.glieder.join(', ')} nicht lückenlos in Reihenfolge an der Adresse (${an.map((t) => t.id).join(', ')})`
  const vorher = summe(an.slice(0, platz[0]).map((t) => t.episodes!))
  const erwartet = summe(folgen.slice(0, e.staffel - 1))
  if (vorher !== erwartet) return `Position: unsere Folgen davor ${vorher}, Netflix ${erwartet}`
  const gliederFolgen = e.glieder.map((g) => an.find((t) => t.id === g)!.episodes!)
  if (summe(gliederFolgen) !== ziel) return `Summe ${summe(gliederFolgen)} statt ${ziel} Folgen`
  let bis = 0
  return new Map(e.glieder.map((g, i) => [g, { teil: i + 1, von: bis + 1, bis: (bis += gliederFolgen[i]!) }]))
}

/** Die Klasse, für die ein Zuschnitt gehört: Netflix-Staffeln, die mehrere unserer Titel lückenlos füllen (Bestandswächter). */
export function zuschnittGruppen(listen: StaffelListen, titel: ZuschnittTitel[]): { kennung: string; staffel: number; glieder: number[] }[] {
  const gruppen: { kennung: string; staffel: number; glieder: number[] }[] = []
  for (const kennung of Object.keys(listen)) {
    const folgen = netflixFolgenliste(`https://www.netflix.com/title/${kennung}`, listen)
    const an = titelAnAdresse(kennung, titel)
    if (!folgen || an.length < 2) continue
    let ende = 0
    const lage = an.map((t) => ({ id: t.id, folgen: t.episodes ?? 0, von: ende, bis: (ende += t.episodes ?? 0) }))
    let vor = 0
    folgen.forEach((f, i) => {
      const glieder = lage.filter((l) => l.folgen > 0 && l.von >= vor && l.bis <= vor + f)
      if (glieder.length > 1 && glieder[0]!.von === vor && glieder.at(-1)!.bis === vor + f) gruppen.push({ kennung, staffel: i + 1, glieder: glieder.map((l) => l.id) })
      vor += f
    })
  }
  return gruppen
}

/** Die Staffelnummer der Reihe für alle Glieder; Text statt Zahl, wenn sie fehlt oder die Glieder verschiedene zählen. */
export function reihennummer(reihe: FranchiseMember[], glieder: number[]): number | string {
  const nummern = [...new Set(glieder.map((g) => staffelStandVon(reihe, g)?.staffel).filter((n): n is number => n !== undefined))]
  if (!nummern.length) return 'keine Staffelnummer der Reihe für die Glieder'
  return nummern.length > 1 ? `unsere Zählung nennt die Glieder Staffel ${nummern.join(' und ')}` : nummern[0]!
}

/** Setzt `anbieterStaffel` an den Gliedern jedes aufgehenden Eintrags; was nicht aufgeht, bleibt ohne Feld und kommt in die Abweichungen. */
export function markiereZuschnitt(reihen: Record<number, FranchiseMember[]>, eintraege: ZuschnittEintrag[], listen: StaffelListen, titel: ZuschnittTitel[]): ZuschnittErgebnis {
  const reiheVon = new Map<number, FranchiseMember[]>()
  for (const r of Object.values(reihen)) for (const m of r) reiheVon.set(m.id, r)
  const ergebnis: ZuschnittErgebnis = { gesetzt: 0, abweichungen: [] }
  for (const e of eintraege) {
    const reihe = reiheVon.get(e.glieder[0]!)
    const teile = zuschneide(e, listen, titel)
    const nr = reihe && e.glieder.every((g) => reiheVon.get(g) === reihe) ? reihennummer(reihe, e.glieder) : 'Glieder nicht in einer Reihe'
    if (typeof teile === 'string' || typeof nr === 'string' || !reihe) {
      ergebnis.abweichungen.push({ url: e.url, staffel: e.staffel, grund: typeof teile === 'string' ? teile : String(nr) })
      continue
    }
    for (const m of reihe.filter((x) => teile.has(x.id))) m.anbieterStaffel = { nr, ...teile.get(m.id)! }
    ergebnis.gesetzt++
  }
  return ergebnis
}
