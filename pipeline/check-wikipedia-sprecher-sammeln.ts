/**
 * Zusicherung zum Sammler der Wikipedia-Sprechertabellen (`lib/wikipedia-sprecher-sammeln.ts`, `lib/wikipedia-sprecher-seite.ts`,
 * `fetch-wikipedia-sprecher.ts`): nur der Abschnitt „Synchron…“ zählt, frische Seiten werden nicht erneut geholt, eine Störung
 * behält den alten Stand, aus der Handliste gefallene Seiten fallen weg; `main` schreibt die Sammlung in die Wurzel.
 *
 * Aufruf: npm run check:logic (steckt darin) oder `tsx pipeline/check-wikipedia-sprecher-sammeln.ts`
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { alsText, FRISCH_TAGE, sammle, type Abruf, type SprecherDatei } from './lib/wikipedia-sprecher-sammeln.ts'
import { sprecherAusSeite, synchronAbschnitte, wikipediaAdresse } from './lib/wikipedia-sprecher-seite.ts'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const tabelle = (name: string) => `{| class="wikitable"\n! Rolle !! Deutsche Stimme\n|-\n| Held || ${name}\n|}`
const folgen = '{| class="wikitable"\n! Nr. !! Titel !! Deutsche Erstausstrahlung\n|-\n| 1 || Anfang || 2020\n|}'
const seite = (ueberschrift: string, ebene = 3) => {
  const g = '='.repeat(ebene)
  return `Einleitung\n== Episodenliste ==\n${folgen}\n== Produktion ==\n${g} ${ueberschrift} ${g}\n${tabelle('Anna Alt')}\n== Rezeption ==\n${folgen}\n`
}

console.log('\nWikipedia-Sprecher: Abschnitt')
pruefe('Episodenliste mit „Deutsche Erstausstrahlung“ vor und nach dem Abschnitt zählt nicht', JSON.stringify(sprecherAusSeite(seite('Synchronisation')).zeilen) === '[{"rolle":"Held","deutsch":[{"sprecher":"Anna Alt","zusatz":null}]}]', sprecherAusSeite(seite('Synchronisation')))
pruefe('„Besetzung und Synchronisation“ und „Synchronsprecher“ gelten, Überschrift wird gemeldet', sprecherAusSeite(seite('Besetzung und Synchronisation')).abschnitt === 'Besetzung und Synchronisation' && sprecherAusSeite(seite('Synchronsprecher', 4)).abschnitt === 'Synchronsprecher')
pruefe('ohne Synchron-Abschnitt keine Tabelle, obwohl die Seite eine deutsche Spalte hat', JSON.stringify(sprecherAusSeite(seite('Musik'))) === '{"deutscheSpalte":false,"zeilen":[],"abschnitt":null}', sprecherAusSeite(seite('Musik')))
const verschachtelt = `== Synchronisation ==\nText\n=== Hauptrollen ===\n${tabelle('Bea Bor')}\n== Weiteres ==\n${tabelle('Cem Cor')}`
pruefe('Unterabschnitt gehört dazu, die nächste Überschrift gleicher Ebene beendet', synchronAbschnitte(verschachtelt)[0]?.text.includes('Bea Bor') === true && !synchronAbschnitte(verschachtelt)[0]?.text.includes('Cem Cor'), synchronAbschnitte(verschachtelt))
const ersterOhne = `=== Synchronisation ===\nnur Text\n=== Synchronsprecher ===\n${tabelle('Dirk Dorn')}`
pruefe('erster Synchron-Abschnitt ohne Tabelle: der nächste mit deutscher Spalte zählt', sprecherAusSeite(ersterOhne).zeilen[0]?.deutsch[0]?.sprecher === 'Dirk Dorn' && sprecherAusSeite(ersterOhne).abschnitt === 'Synchronsprecher')
pruefe('Adresse mit Unterstrich und Kodierung', wikipediaAdresse('Ranma ½') === 'https://de.wikipedia.org/wiki/Ranma_%C2%BD')

console.log('\nWikipedia-Sprecher: Sammeln')
const heute = '2026-11-27'
const alt: SprecherDatei = {
  seiten: {
    Frisch: { abgerufen: '2026-11-21', abschnitt: 'Synchronisation', zeilen: [] },
    Alt: { abgerufen: '2026-11-20', abschnitt: 'Synchronisation', zeilen: [{ rolle: 'R', deutsch: [{ sprecher: 'Vorher', zusatz: null }] }] },
    Gestoert: { abgerufen: '2026-10-01', abschnitt: 'Synchronisation', zeilen: [{ rolle: 'R', deutsch: [{ sprecher: 'Bleibt', zusatz: null }] }] },
    Weiter: { abgerufen: '2026-10-01', abschnitt: null, zeilen: [] },
    Entfernt: { abgerufen: '2026-11-26', abschnitt: null, zeilen: [] },
  },
}
const protokoll: string[] = []
const antworten: Record<string, { status: number; text: string } | Error> = {
  Alt: { status: 200, text: seite('Synchronisation') },
  Gestoert: { status: 429, text: '' },
  Weiter: { status: 200, text: '#WEITERLEITUNG [[Ziel]]' },
  Neu: new Error('Netz weg'),
}
const zweiZeilen = `=== Synchronisation ===\n{| class="wikitable"\n! Rolle !! Deutsche Stimme\n|-\n| Held || Anna Alt\n|-\n| Freund || Bernd Bar\n|}`
const abruf: Abruf = async (s) => {
  protokoll.push(`abruf ${s}`)
  const a = antworten[s]
  if (!a) throw new Error(`unerwartet: ${s}`)
  if (a instanceof Error) throw a
  return a
}
const erg = await sammle(['Frisch', 'Alt', 'Gestoert', 'Weiter', 'Neu'], alt, abruf, heute, async () => void protokoll.push('pause'))
pruefe(`frische Seite (< ${FRISCH_TAGE} Tage) wird nicht geholt, die übrigen mit Pause dazwischen`, protokoll.join(',') === 'abruf Alt,pause,abruf Gestoert,pause,abruf Weiter,pause,abruf Neu', protokoll)
pruefe('Grenze: genau 7 Tage alt wird geholt', FRISCH_TAGE === 7 && protokoll.includes('abruf Alt'))
pruefe('geholte Seite: neues Datum und Zeilen', erg.datei.seiten.Alt?.abgerufen === heute && erg.datei.seiten.Alt.zeilen[0]?.deutsch[0]?.sprecher === 'Anna Alt', erg.datei.seiten.Alt)
pruefe('HTTP 429 behält den alten Stand und meldet', erg.datei.seiten.Gestoert?.zeilen[0]?.deutsch[0]?.sprecher === 'Bleibt' && erg.stoerungen.includes('Gestoert: HTTP 429'), erg.stoerungen)
pruefe('Weiterleitung ist eine Störung, alter Stand bleibt', erg.datei.seiten.Weiter?.abgerufen === '2026-10-01' && erg.stoerungen.some((s) => s.startsWith('Weiter: Weiterleitung')))
pruefe('Netzfehler ohne alten Stand: keine Seite, gemeldet', !('Neu' in erg.datei.seiten) && erg.stoerungen.includes('Neu: Netz weg'))
pruefe('Seite nicht mehr in der Handliste fällt weg, frische bleibt', !('Entfernt' in erg.datei.seiten) && erg.datei.seiten.Frisch === alt.seiten.Frisch)
pruefe('Abrufzahl', erg.abrufe === 4, erg.abrufe)
pruefe('Textform ist gültiges JSON mit demselben Inhalt', JSON.stringify(JSON.parse(alsText(erg.datei))) === JSON.stringify(erg.datei))
const zwei = await sammle(['Z', 'Leer'], { seiten: {} }, async (s) => ({ status: 200, text: s === 'Z' ? zweiZeilen : 'kein Abschnitt' }), heute, async () => undefined)
pruefe(
  'Textform: eine Tabellenzeile je Textzeile, eine Seite je Block',
  alsText(zwei.datei) ===
    '{\n  "seiten": {\n    "Z": { "abgerufen": "2026-11-27", "abschnitt": "Synchronisation", "zeilen": [\n      {"rolle":"Held","deutsch":[{"sprecher":"Anna Alt","zusatz":null}]},\n      {"rolle":"Freund","deutsch":[{"sprecher":"Bernd Bar","zusatz":null}]}\n    ] },\n    "Leer": { "abgerufen": "2026-11-27", "abschnitt": null, "zeilen": [] }\n  }\n}\n',
  alsText(zwei.datei),
)
const keinFehler = await sammle(['S'], { seiten: {} }, async () => Promise.reject('nur Text'), heute, async () => undefined)
pruefe('geworfener Text (kein Error) wird gemeldet', keinFehler.stoerungen.join() === 'S: nur Text', keinFehler.stoerungen)

console.log('\nWikipedia-Sprecher: main in der Wurzel')
const wurzel = mkdtempSync(join(tmpdir(), 'ak-wikipedia-sprecher-'))
process.env.AK_ROOT = wurzel
mkdirSync(join(wurzel, 'data'))
writeFileSync(join(wurzel, 'data', 'wikipedia-sprecher-seiten.yaml'), '- seite: Serie A\n  titel:\n    - id: 900001\n- seite: Serie B\n  titel:\n    - id: 900002\n')
const ausgabe: string[] = []
const echtLog = console.log
const echtWarn = console.warn
const mitschreiben = (): void => {
  console.log = (...a: unknown[]) => void ausgabe.push(a.join(' '))
  console.warn = (...a: unknown[]) => void ausgabe.push(a.join(' '))
}
const zurueck = (): void => {
  console.log = echtLog
  console.warn = echtWarn
}
const gesundheit = () => readSourceHealth()['wikipedia-sprecher'] as { lastOk?: string; lastCount: number; lastError?: string }
const { main } = await import('./fetch-wikipedia-sprecher.ts')
const { readSourceHealth } = await import('./lib/health.ts')

// Alles gestört, keine alte Sammlung: der Lauf ist rot.
mitschreiben()
await main(async () => ({ status: 404, text: '' }), async () => undefined)
zurueck()
pruefe('jeder Abruf gestört: Quelle rot mit Grund, Störung je Seite gemeldet', gesundheit().lastOk === undefined && gesundheit().lastError === '2 von 2 Abrufen gestört' && ausgabe.some((z) => z.includes('Wikipedia-Sprecher Serie B: HTTP 404')), [gesundheit(), ausgabe])

// Erfolg über den eingebauten Abruf (globales fetch), mit echter Pause zwischen zwei Seiten.
const anfragen: { url: string; ua: string | null; redirect?: string }[] = []
const echtFetch = globalThis.fetch
globalThis.fetch = (async (u: string, o: RequestInit) => {
  anfragen.push({ url: String(u), ua: new Headers(o.headers).get('User-Agent'), redirect: o.redirect })
  return new Response(seite('Synchronisation'), { status: 200 })
}) as typeof fetch
ausgabe.length = 0
const start = performance.now()
mitschreiben()
await main()
zurueck()
const dauer = performance.now() - start
globalThis.fetch = echtFetch
pruefe(
  'eingebauter Abruf: /wiki/<Seite>?action=raw, eigener User-Agent, Weiterleitung nicht folgen',
  anfragen.map((a) => a.url).join('|') === 'https://de.wikipedia.org/wiki/Serie_A?action=raw|https://de.wikipedia.org/wiki/Serie_B?action=raw' &&
    anfragen.every((a) => a.ua?.startsWith('anime-kalender-de/') && a.redirect === 'manual'),
  anfragen,
)
pruefe('eingebaute Pause: rund 2 s zwischen zwei Abrufen', dauer >= 1900 && dauer < 6000, Math.round(dauer))
const datei = JSON.parse(readFileSync(join(wurzel, 'data', 'wikipedia-sprecher.json'), 'utf8')) as SprecherDatei
pruefe('main schreibt die Sammlung', Object.keys(datei.seiten).join('|') === 'Serie A|Serie B' && datei.seiten['Serie A']?.zeilen.length === 1, datei)
pruefe('Quelle grün mit Zahl der Seiten mit Tabelle', typeof gesundheit().lastOk === 'string' && gesundheit().lastCount === 2 && gesundheit().lastError === undefined, gesundheit())
pruefe('Zusammenfassung', ausgabe.includes('[pipeline] Wikipedia-Sprecher: 2 Seiten in der Handliste, 2 abgerufen, 0 gestört, 2 mit deutscher Tabelle → data/wikipedia-sprecher.json'), ausgabe)

// Seiten ohne deutsche Tabelle: der Abruf hat gearbeitet (grün), ein zweiter Lauf am selben Tag holt nichts und bleibt grün.
rmSync(join(wurzel, 'data', 'wikipedia-sprecher.json'))
const vorherOk = gesundheit().lastOk
await new Promise((r) => setTimeout(r, 5))
await main(async () => ({ status: 200, text: 'kein Abschnitt' }), async () => undefined)
const ersterOk = gesundheit().lastOk
pruefe('gelungene Abrufe ohne Tabelle: grün', typeof ersterOk === 'string' && ersterOk !== vorherOk && gesundheit().lastCount === 0, gesundheit())
await new Promise((r) => setTimeout(r, 5))
await main(async () => {
  throw new Error('darf nicht abrufen')
}, async () => undefined)
pruefe('nichts zu holen und nichts mit Tabelle: trotzdem grün', typeof gesundheit().lastOk === 'string' && gesundheit().lastOk !== ersterOk, gesundheit())

// Als Skript: der Startblock ruft main (leere Handliste, kein Abruf).
writeFileSync(join(wurzel, 'data', 'wikipedia-sprecher-seiten.yaml'), '[]\n')
rmSync(join(wurzel, 'data', 'wikipedia-sprecher.json'))
const kind = spawnSync(process.execPath, [join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(REPO, 'pipeline', 'fetch-wikipedia-sprecher.ts')], { env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 60_000 })
pruefe('als Skript gestartet: Exit 0, Sammlung geschrieben', kind.status === 0 && existsSync(join(wurzel, 'data', 'wikipedia-sprecher.json')), [kind.status, kind.stderr.slice(-300)])
rmSync(wurzel, { recursive: true, force: true })

if (verletzt) {
  console.error(`\n${verletzt} Prüfung(en) verletzt`)
  process.exit(1)
}
console.log('\nWikipedia-Sprecher (Sammler): alle Prüfungen ok')
