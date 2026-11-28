/**
 * Test der Mängelart `tv-sichtung-ohne-folge` an der Sichtung vom 13.11.2026 (Pokémon Horizonte, „Ein Lied im Nebel“).
 * Die Folgenliste ist die echte aus `data/wikipedia-folgen.json`; die Nummer wird aus ihr gelesen, nicht gesetzt.
 */
import { readFileSync } from 'node:fs'
import type { Release, Title } from '../shared/types.ts'
import { titelMitSichtungOhneFolge, tvSichtungOhneFolge } from './lib/maengel-tv-folge.ts'
import { REGELN, zaehleMaengel, type Kontext } from './lib/maengel-regeln.ts'
import type { WikiListen } from './lib/tv-termine.ts'
import { mitAnisearchErsatz } from './lib/tv-folgen-ersatz.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}`)
}

const ID = 158871
const UNBEKANNT = 'Ein Lied im Sturm'
const titelMap = new Map([[ID, { id: ID, franchiseId: ID }]]) as unknown as Map<number, Title>
const wiki: WikiListen = { [ID]: JSON.parse(readFileSync('data/wikipedia-folgen.json', 'utf8')).titel[ID] }
const zeile = wiki[ID].folgen.find((f) => f.dt === 'Lied im Nebel')
pruefe('echte Liste führt „Lied im Nebel“ mit Nummer', zeile?.nr !== undefined)

const sendung = (folge: string, nr?: number) => ({ start: '2026-11-13T17:15', ende: '2026-11-13T17:45', folge, ...(nr ? { nr } : {}) })
const termin = (sendungen: Release['sendungen']): Release => ({ platform: 'tv', sendungen }) as unknown as Release
const tvTermin = (sender: string): Release => ({ titleId: ID, platform: 'tv', sender, schedule: { firstEpisodeDate: '2026-09-01' } }) as unknown as Release
const programm = (folge: string, sender = 'Super RTL') => ({ titleId: ID, titel: 'Pokémon Horizonte: Die Serie', folge, sender, start: '2026-11-13T17:15:00+01:00', ende: '2026-11-13T17:45:00+01:00', gesehenAm: '2026-11-13' })
const messe = (releases: Release[], ...folgen: [string, string?][]) => titelMitSichtungOhneFolge(releases, folgen.map(([f, s]) => programm(f, s)), wiki, titelMap)

pruefe('Fixture „Ein Lied im Sturm“ (nicht in der Liste) ohne Nummer: Mangel', messe([tvTermin('Super RTL')], [UNBEKANNT]).has(ID))
pruefe('Wikipedia-Schreibweise „Lied im Nebel“: Nummer gefunden, kein Mangel', !messe([tvTermin('Super RTL')], ['Lied im Nebel']).has(ID))
pruefe('Sender-Schreibweise „Ein Lied im Nebel“ (Wikipedia: ohne Artikel): Nummer über den Artikel-Rückfall, kein Mangel', !messe([tvTermin('Super RTL')], ['Ein Lied im Nebel']).has(ID))
pruefe('Vorspann „Pokémon Horizonte: Ein Lied im Nebel“ wird nicht gestrichen (falsche Folge wäre möglich): Mangel bleibt', messe([tvTermin('Super RTL')], ['Pokémon Horizonte: Ein Lied im Nebel']).has(ID))
pruefe('Schreibvariante „Lied im Nebl“ (ein Zeichen daneben): Nummer über aehnlicherKern, kein Mangel', !messe([tvTermin('Super RTL')], ['Lied im Nebl']).has(ID))
pruefe('Sendung vom 13.11. zählt, auch außerhalb des Bau-Fensters ab gestern', messe([tvTermin('Super RTL')], [UNBEKANNT]).size === 1)
pruefe('Sendung ohne Folgentitel: kein Mangel', !messe([tvTermin('Super RTL')], ['']).has(ID))
pruefe('Termin eines anderen Senders: Sendung gehört nicht dazu', !messe([tvTermin('TOGGO plus')], [UNBEKANNT]).has(ID))
pruefe('Streaming-Termin zählt nicht', !messe([{ ...tvTermin('Super RTL'), platform: 'netflix' } as Release], [UNBEKANNT]).has(ID))

pruefe('Termine: einer ohne Nummer unter gezählten genügt (outer some)', tvSichtungOhneFolge([termin([sendung('A', 1)]), termin([sendung(UNBEKANNT)])]))
pruefe('Termine: der ohne Nummer zuerst, gezählter danach', tvSichtungOhneFolge([termin([sendung(UNBEKANNT)]), termin([sendung('A', 1)])]))
pruefe('Termine: alle gezählt, kein Mangel', !tvSichtungOhneFolge([termin([sendung('A', 1)]), termin([sendung('B', 2)])]))
pruefe('Sendungen: eine ohne Nummer unter gezählten genügt (inner some)', tvSichtungOhneFolge([termin([sendung('A', 1), sendung(UNBEKANNT)])]))
pruefe('Streaming-Termin ohne Nummer zählt nicht', !tvSichtungOhneFolge([{ platform: 'netflix', sendungen: [sendung('X')] } as unknown as Release]))

// Verhalten der Regel (A2): zählt die Regel, mit welcher Wirkung, und fließt die Messung hinein?
const regel = REGELN.filter((r) => r.art === 'tv-sichtung-ohne-folge')
const titel = [{ id: ID }, { id: 1 }] as unknown as Title[]
const kontext = (tvOhneFolge: Set<number>) => ({ heute: '2026-11-22', tvOhneFolge, releases: new Map() }) as unknown as Kontext
const mit = zaehleMaengel(titel, kontext(messe([tvTermin('Super RTL')], [UNBEKANNT])), regel)
pruefe('Regel zählt genau den Titel mit Sichtung ohne Nummer', mit.length === 1 && mit[0].t === ID)
pruefe('Regel: Art, Wirkung 2 und Hersteller auto:bau', mit[0]?.art === 'tv-sichtung-ohne-folge' && mit[0]?.wirkung === 2 && mit[0]?.wer === 'auto:bau')
pruefe('Regel: ohne Sichtung ohne Nummer kein Treffer', zaehleMaengel(titel, kontext(messe([tvTermin('Super RTL')], ['Lied im Nebel'])), regel).length === 0)

// Umhängen wie im Bau: Folgentitel steht nur in der Liste des Geschwistertitels → die Sendung gehört ihm, der Ursprungstitel hat keinen Mangel.
const [MUTTER, KIND, ANDERE] = [900001, 900002, 900003]
const reihe = new Map([MUTTER, KIND, ANDERE].map((id) => [id, { id, franchiseId: MUTTER }])) as unknown as Map<number, Title>
const listen: WikiListen = {
  [MUTTER]: { seite: 'A', folgen: [{ nr: 1, dt: 'Der alte Hafen am Meer' }] },
  [KIND]: { seite: 'B', folgen: [{ nr: 1, dt: 'Der Neuanfang der Strohhüte' }] },
  [ANDERE]: { seite: 'C', folgen: [{ nr: 1, dt: 'Etwas ganz anderes hier' }] },
}
const mutterTermin = { titleId: MUTTER, platform: 'tv', sender: 'Super RTL', schedule: { firstEpisodeDate: '2026-09-01' } } as unknown as Release
const reiheSendung = (folge: string) => ({ ...programm(folge), titleId: MUTTER })
const reiheMessung = (folge: string) => titelMitSichtungOhneFolge([mutterTermin], [reiheSendung(folge)], listen, reihe)
pruefe('Umhängen: Folgentitel nur beim Geschwister → Mutter ohne Mangel', !reiheMessung('Serie: Der Neuanfang der Strohhüte').has(MUTTER))
pruefe('Umhängen: Folgentitel in keiner Liste → Mutter hat den Mangel', reiheMessung('Der Fund im Nirgendwo').has(MUTTER))
pruefe('Umhängen: Folgentitel in der eigenen Liste → Nummer, kein Mangel', !reiheMessung('Der alte Hafen am Meer').has(MUTTER))

// Artikel-Rückfall erst ab 10 Zeichen Kern; wörtliche Treffer gelten auch kurz.
const KURZ = 900004
const kurzListen: WikiListen = { [KURZ]: { seite: 'D', folgen: [{ nr: 5, dt: 'Held' }, { nr: 6, dt: 'Lied am Meer' }, { nr: 7, dt: 'Lied am See' }, { nr: 8, dt: '?' }, { nr: 9, dt: 'Chronik des Grauens' }] } }
const kurzTermin = { titleId: KURZ, platform: 'tv', sender: 'Super RTL', schedule: { firstEpisodeDate: '2026-09-01' } } as unknown as Release
const kurzMessung = (folge: string) => titelMitSichtungOhneFolge([kurzTermin], [{ ...programm(folge), titleId: KURZ }], kurzListen, new Map([[KURZ, { id: KURZ }]]) as unknown as Map<number, Title>)
pruefe('Kurz: wörtlicher Treffer „Held“ zählt', !kurzMessung('Held').has(KURZ))
pruefe('Kurz: „Der Held“ (Kern 4 nach Artikel) wird nicht geraten', kurzMessung('Der Held').has(KURZ))
pruefe('Kurz: „Ein Lied am Meer“ (Kern genau 10) trifft', !kurzMessung('Ein Lied am Meer').has(KURZ))
pruefe('Kurz: „Ein Lied am See“ (Kern 9) wird nicht geraten', kurzMessung('Ein Lied am See').has(KURZ))
pruefe('Kurz: Eintrag mit leerem Kern (dt „?“) ordnet keiner fremden Sendung seine Nummer zu', kurzMessung('Völlig anderer Folgentitel').has(KURZ))
pruefe('Kurz: „Die Chronik des Grauens“ trifft über den Artikel „die“', !kurzMessung('Die Chronik des Grauens').has(KURZ))
pruefe('Kurz: Titel ohne jede Liste: Mangel statt Absturz', titelMitSichtungOhneFolge([kurzTermin], [{ ...programm('Irgendeine Folge'), titleId: KURZ }], {}, new Map([[KURZ, { id: KURZ }]]) as unknown as Map<number, Title>).has(KURZ))

// aniSearch-Ersatz (28.11.2026, Dororo/Eyeshield 21): TMDB führt den Folgentitel anders, aniSearch kennt ihn; nur bei gleichem Zählmaß.
const ER = 900005
const erTermin = { titleId: ER, platform: 'tv', sender: 'Super RTL', schedule: { firstEpisodeDate: '2026-09-01' } } as unknown as Release
const aniListe: WikiListen = { [ER]: { seite: 'aniSearch', url: 'u', folgen: [{ nr: 1, dt: 'Der Götterbote' }, { nr: 2, dt: 'Das Kapitel von Saru' }, { nr: 3, dt: 'Halbzeit für die Bats' }] } }
const tmdbListe = (hoechste: number): WikiListen => ({ [ER]: { seite: 'TMDB', url: 'u', folgen: [{ nr: 1, dt: 'Ein Bote der Götter' }, { nr: hoechste, dt: 'Etwas ganz anderes hier' }] } })
const erMessung = (liste: WikiListen, folge: string) => titelMitSichtungOhneFolge([erTermin], [{ ...programm(folge), titleId: ER }], liste, new Map([[ER, { id: ER }]]) as unknown as Map<number, Title>)
const mitErsatz = mitAnisearchErsatz(tmdbListe(3), aniListe)
pruefe('Ersatz: Folgentitel nur bei aniSearch: Nummer gefunden, kein Mangel', !erMessung(mitErsatz, 'Das Kapitel von Saru').has(ER))
pruefe('Ersatz: Folgentitel bei keiner Liste: Mangel bleibt', erMessung(mitErsatz, 'Ein ganz neuer Titel').has(ER))
pruefe('Ersatz: ohne Ersatz (TMDB allein) fehlt die Nummer', erMessung(tmdbListe(3), 'Das Kapitel von Saru').has(ER))
pruefe('Ersatz: führende Liste zählt höher als aniSearch (Pokémon Reisen 1235 gegen 90): kein Ersatz, keine fremde Zählung', mitAnisearchErsatz(tmdbListe(1235), aniListe)[ER]!.ersatz === undefined)
pruefe('Ersatz: aniSearch führt selbst: kein Ersatz bei sich selbst', mitAnisearchErsatz(aniListe, aniListe)[ER]!.ersatz === undefined)

process.exit(verletzt ? 1 : 0)
