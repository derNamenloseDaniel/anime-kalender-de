/**
 * Zusicherungen zur AniList-Frische (Rang 7b, 22.11.2026): ein abgeschlossener Eintrag mit offenem Mangel (Wertung oder Studio fehlt) wird neu geholt,
 * ohne Mangel nicht; ein Eintrag mit Mangel, der heute schon geholt wurde, nicht; höchstens `grenze` je Lauf, älteste zuerst. Reine Einheit, kein Netz. Aufruf: `check:logic`.
 */
import { hatOffenenMangel, mangelNeuHolen, zuHolen, MANGEL_ABSTAND_TAGE, type MitStempel } from './lib/anilist-mangel.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const HEUTE = '2026-11-22'
const studio = { nodes: [{ name: 'Studio X', isAnimationStudio: true }] }
const eintrag = (id: number, o: Partial<MitStempel> = {}): MitStempel =>
  ({ id, status: 'FINISHED', averageScore: 70, meanScore: 70, studios: studio, ...o }) as MitStempel

const speicher: Record<string, MitStempel> = {
  900001: eintrag(900001, { averageScore: null, meanScore: null, abgerufen: '2026-09-01' }), // veraltet, Wertung fehlt
  900002: eintrag(900002, { studios: { nodes: [] }, abgerufen: '2026-10-01' }), // veraltet, Studio fehlt
  900003: eintrag(900003, { abgerufen: HEUTE }), // frisch, ohne Mangel
  900004: eintrag(900004, { abgerufen: '2026-01-01' }), // veraltet, ohne Mangel: wie bisher nicht
  900005: eintrag(900005, { averageScore: null, meanScore: null, abgerufen: HEUTE }), // frisch, mit Mangel: heute schon gefragt
  900006: eintrag(900006, { studios: { nodes: [] } }), // ohne Stempel (Altbestand), Studio fehlt
  900007: eintrag(900007, { studios: { nodes: [] }, abgerufen: '2026-11-21' }), // gestern, unter dem Abstand
  900008: eintrag(900008, { averageScore: null, meanScore: 64, abgerufen: '2026-11-20' }), // genau am Abstand, meanScore zählt als Wertung
}
const ids = Object.keys(speicher).map(Number)

pruefe('Mangel: Wertung fehlt', hatOffenenMangel(speicher[900001]!) && hatOffenenMangel(eintrag(1, { averageScore: null, meanScore: undefined })))
pruefe('Mangel: Studio fehlt', hatOffenenMangel(speicher[900002]!))
pruefe('kein Mangel: Wertung (auch nur meanScore) und Studio da', !hatOffenenMangel(speicher[900003]!) && !hatOffenenMangel(speicher[900008]!))

const geholt = mangelNeuHolen(speicher, ids, HEUTE)
pruefe('veraltet mit Mangel (Wertung, Studio, ohne Stempel) wird neu geholt, älteste zuerst', JSON.stringify(geholt) === JSON.stringify([900006, 900001, 900002]), geholt)
pruefe('frisch ohne Mangel und veraltet ohne Mangel bleiben', !geholt.includes(900003) && !geholt.includes(900004))
pruefe('frisch mit Mangel (heute geholt) und gestern geholt bleiben', !geholt.includes(900005) && !geholt.includes(900007))
pruefe(`Abstand ${MANGEL_ABSTAND_TAGE} Tage: genau am Abstand gilt, einen Tag davor nicht`, mangelNeuHolen({ 9: eintrag(9, { studios: { nodes: [] }, abgerufen: '2026-11-20' }) }, [9], HEUTE).length === 1 && mangelNeuHolen({ 9: eintrag(9, { studios: { nodes: [] }, abgerufen: '2026-11-21' }) }, [9], HEUTE).length === 0)
pruefe('Grenze: höchstens 2 je Lauf, die ältesten', JSON.stringify(mangelNeuHolen(speicher, ids, HEUTE, 2)) === JSON.stringify([900006, 900001]), mangelNeuHolen(speicher, ids, HEUTE, 2))
pruefe('Mangel: Eintrag ganz ohne Studio-Angabe zählt als Mangel', hatOffenenMangel({ averageScore: 70, meanScore: 70, studios: undefined } as unknown as MitStempel))
const viele: Record<string, MitStempel> = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [900100 + i, eintrag(900100 + i, { studios: { nodes: [] } })]))
pruefe('Standardgrenze: 101 Einträge mit Mangel, 100 je Lauf', mangelNeuHolen(viele, Object.keys(viele).map(Number), HEUTE).length === 100)
const laufend = (m: MitStempel): boolean => m.id === 900003
const gesamt = zuHolen(speicher, [...ids, 777777], laufend, HEUTE)
pruefe('zuHolen: fehlende (777777) und noch offene (900003) Einträge zusätzlich zu den Mangel-Einträgen', gesamt.includes(777777) && gesamt.includes(900003) && gesamt.includes(900001) && !gesamt.includes(900004), gesamt)
pruefe('Kennungen ohne Eintrag werden nicht erfunden', mangelNeuHolen(speicher, [777777, 900001], HEUTE).join() === '900001')

process.exit(verletzt ? 1 : 0)
