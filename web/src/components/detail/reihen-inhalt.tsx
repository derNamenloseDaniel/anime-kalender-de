import { type FranchiseMember, type Title } from '@shared/types.ts'
import { hauptstaffeln, nachJahrUndId, staffelBeschriftungen, staffelStaende } from '@shared/titles.ts'
import { angabenZeile, kuenftig as istKuenftig, teilNamen } from './reihen-teil.ts'
import { ReihenCover } from './reihen-cover.tsx'
import { doppelteZusaetzeDerReihe, type FolgenText } from './reihen-doppelt.ts'
import { ReihenSpur } from './reihen-spur.tsx'
import { ReihenKopf } from './reihen-kopf.tsx'
import { reihenGruppen } from './reihen-gruppen.ts'
import { gruppenZeilen } from './reihen-zeilen.ts'
import { gezeigteGruppen } from './reihen-uebersicht-regeln.ts'
import type { Translate } from '../../lib/i18n.tsx'
import type { Dispatch, SetStateAction } from 'react'

export type ReihenListeProps = {
  reihenTeile: FranchiseMember[]
  t: Translate
  reihenName: string
  title: Title
  favorites: Set<number>
  wechsleZu: (id: number) => void
  reihenSchluessel: number
  reiheSuche: { reihe: number; text: string; }
  setReiheSuche: Dispatch<SetStateAction<{ reihe: number; text: string; }>>
  /** Titel, die als Reiter am Antwortkasten stehen (F157): sie fehlen in den Gruppen, nichts steht zweimal da. */
  ohne?: ReadonlySet<number>
}

/** Wie die Reihe geordnet wird: Hauptstaffeln, Gruppen (ohne die Teile in `ohne`), Staffelnummern. */
export function reihenOrdnung(reihenTeile: FranchiseMember[], reihenName: string, t: Translate, ohne: ReadonlySet<number> = new Set()) {
  const jahr = new Date().getFullYear()
  const kuenftig = (m: FranchiseMember) => istKuenftig(m, jahr)
  /* Ein Titel ohne Jahr gehört ans Ende: `?? 0` stellte undatierte Kurzformate vor die Serie von 1999 (One Piece, 03.09.2026). */
  const nachJahr = nachJahrUndId

  /*
    **Was eine Hauptstaffel ist, entscheidet die Reihe selbst.**

    `istStaffel` zählt ONA mit, und das ist richtig: Viele neue
    Serien laufen als ONA („Beastars"). Für die **Zählung** einer
    Reihe ist es falsch, sobald sie daneben Kurzformate führt —
    „One Piece: Annecy Festival" und „Koisuru One Piece" sind keine
    Staffeln, sie haben nur dasselbe Format.

    Also: Gibt es in der Reihe echte Fernsehstaffeln, zählen nur
    die. Gibt es keine, zählen die ONAs — dann sind sie die Serie.

    **Kurzformate zählen nie mit.** „Chopper's" ist ein TV_SHORT und
    stand damit unter „Hauptserie" (Daniel, 03.09.2026:
    „choppers gehört nicht zur hauptserie"). Eine Sendung von fünf
    Minuten ist Beiwerk, auch wenn sie im Fernsehen läuft.
  */
  /*
    **Und bei chinesischen Produktionen entscheidet das Format
    gar nichts.** Dort ist jeder Teil eine ONA — Serie, Specials
    und Chibi-Kurzfilme gleichermaßen. Bei „Lord of Mysteries"
    standen deshalb alle vier Teile unter „Hauptserie" (Daniel,
    12.09.2026: „they are specials and categorized as
    hauptserie").

    AniList sagt es trotzdem: Ein Special nennt die Serie, zu
    der es gehört (`PARENT`), eine Staffel tut das nicht. Der
    Bau reicht das als `beiwerk` durch.
  */
  const hauptIds = new Set(hauptstaffeln(reihenTeile).map((m) => m.id))
  const istHauptstaffel = (m: FranchiseMember) => hauptIds.has(m.id)
  /*
    **Was noch nicht da ist, gehört trotzdem zu seiner Art.**

    Bis zum 04.09.2026 gab es dafür eine vierte Gruppe, „NOCH
    NICHT ERSCHIENEN", ganz unten. Bei „Black Clover" stand
    Staffel 2 damit **unter** zwei Specials und einem Film —
    Daniel sah sie erst nach dem Scrollen und hielt sie für
    fehlend: „ich hab staffel 2 nicht gesehen unter hauptserie
    … keine seperate kategorie ,noch nicht erschienen', sondern
    direkt dort einsortieren wozu es gehört."

    Er hat recht, und zwar nicht nur für diesen Fall: Wer eine
    Reihe aufschlägt, sucht die nächste Staffel — und die ist
    per Definition die, die noch aussteht. Sie ans Ende aller
    Kategorien zu schieben versteckt genau das, wonach gesucht
    wird.

    Innerhalb einer Kategorie stehen die künftigen Teile hinten,
    nach Jahr sortiert. Als **gestrichelt** bleiben sie erkennbar
    — das war ohnehin die Zeilenmarkierung, nicht die Überschrift.
  */
  const nachStandUndJahr = (a: FranchiseMember, b: FranchiseMember) =>
    Number(kuenftig(a)) - Number(kuenftig(b)) || nachJahr(a, b)
  /* Vier Gruppen mit Überschrift (Hauptserie, Beiwerk, Filme), je chronologisch: bei „One Piece" standen 64 Teile in einer Liste. */
  const gruppen = reihenGruppen(reihenTeile, istHauptstaffel, nachStandUndJahr, t)
    .map((g) => ({ ...g, teile: g.teile.filter((m) => !ohne.has(m.id)) }))
    .filter((g) => g.teile.length > 0)

  /*
    Gezählt wird nur, wo die Nummer etwas unterscheidet: One Piece (ein Eintrag) bleibt ohne „Staffel 1".
    Ab zwei Staffeln trägt jede ihre Nummer, auch mit eigenem Namen; `staffelLabel` bleibt der Rückfall.
  */
  const staffelLabel = staffelBeschriftungen(reihenTeile.filter(istHauptstaffel), reihenName)
  const nummern = staffelStaende(reihenTeile.filter(istHauptstaffel), reihenName)
  const folgenText: FolgenText = (staffel, von, bis, mitStaffel) => t(mitStaffel ? 'detail.reiheFolgenMitS' : 'detail.reiheFolgen', { staffel, von, bis })
  const unterschied = doppelteZusaetzeDerReihe(reihenTeile.filter(istHauptstaffel), reihenName, staffelLabel, nummern, folgenText)
  return { kuenftig, istHauptstaffel, gruppen, staffelLabel, nummern, unterschied }
}

export type Ordnung = ReturnType<typeof reihenOrdnung>

/** Ein Teil als Cover-Karte der Spur; Spur und Übersicht großer Reihen bauen sie hier, damit beide gleich groß sind. */
export function reihenKarte(m: FranchiseMember, o: Ordnung, p: Pick<ReihenListeProps, 't' | 'reihenName' | 'title' | 'favorites' | 'wechsleZu'>) {
  const offen = o.kuenftig(m)
  return (
    <ReihenCover
      key={m.id}
      m={m}
      t={p.t}
      offen={offen}
      gewaehlt={m.id === p.title.id}
      gemerkt={p.favorites.has(m.id)}
      nr={o.nummern.get(m.id)}
      unterschied={o.unterschied.get(m.id)}
      namen={teilNamen(m, p.reihenName, o.istHauptstaffel(m), o.staffelLabel.get(m.id))}
      angaben={angabenZeile(m, offen, p.t)}
      onWaehlen={p.wechsleZu}
    />
  )
}

/** Der Inhalt der Reihen-Karte:Suche, Schalter und die Gruppen mit ihren Teilen. */
export function reihenInhalt({ reihenTeile, t, reihenName, title, favorites, wechsleZu, reihenSchluessel, reiheSuche, setReiheSuche, ohne = new Set() }: ReihenListeProps) {
  const o = reihenOrdnung(reihenTeile, reihenName, t, ohne)
  const { gruppen } = o
  const karte = (m: FranchiseMember) => reihenKarte(m, o, { t, reihenName, title, favorites, wechsleZu })

  const lang = reihenTeile.length >= 15
  const suchText = reiheSuche.reihe === reihenSchluessel ? reiheSuche.text.trim() : ''
  const gefiltert = gezeigteGruppen(gruppen, suchText)

  return (
    <div className="flex flex-col gap-0.5">
      {lang && <ReihenKopf t={t} suche={suchText ? reiheSuche.text : ''} onSuche={(text) => setReiheSuche({ reihe: reihenSchluessel, text })} />}
      {!gefiltert.length && <span className="px-1 py-2 text-t4 text-ak-leise">{t('detail.reiheKeinTreffer')}</span>}
      {gruppenZeilen(gefiltert).map((zeile, i) => (
        <div key={zeile[0]!.titel} className={zeile.length > 1 ? 'grid grid-cols-2 gap-x-2' : undefined}>
          {zeile.map((g) => (
            <div key={g.titel} className="min-w-0">
              <ReihenSpur titel={g.titel} gewaehltId={title.id} erste={i === 0} t={t}>
                {g.teile.map(karte)}
              </ReihenSpur>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
