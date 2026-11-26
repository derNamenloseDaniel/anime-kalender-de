/**
 * Bestandsprüfer (26.11.2026, Kuroko Movie 2 102836): Kein Titel steht als `kein-weg` oder `erstausgabe-ohne-weg` offen, wenn ein sicherer, begonnener
 * Streaming-Termin (gebaut in `releases.json` oder kuratiert in `data/curated/*.yaml`) einen Weg nennt und kein gültiges Nein ihn verneint
 * (`keinWegTrotzQuelle`). Rot bei einem solchen Termin; ein jüngster Handbeleg „deutsch“ ohne Weg ist nur eine Warnung (die Adresse kann tot sein).
 * Kino zählt bewusst nicht als Weg.
 */
import { readdirSync, readFileSync } from 'node:fs'
import yaml from 'js-yaml'
import type { Release } from '../shared/types.ts'
import { todayIso } from '../shared/time.ts'
import { ladeHandbelege } from './lib/dub-confirmed.ts'
import { baueNeinGilt } from './lib/maengel-nein.ts'
import { MAENGEL_DATEI, type Register } from './lib/maengel-register.ts'
import { keinWegTrotzQuelle, OHNE_WEG_ARTEN, type KuratierterEintrag } from './lib/kein-weg-trotz-quelle.ts'

const register = JSON.parse(readFileSync(MAENGEL_DATEI, 'utf8')) as Register
const releases = JSON.parse(readFileSync('public/data/releases.json', 'utf8')) as Release[]
if (!register.zeilen?.length || !releases.length) {
  console.error(`FEHLER: ${register.zeilen?.length ?? 0} Mängelzeilen, ${releases.length} Releases gelesen`)
  process.exit(1)
}
const offen = new Set(register.zeilen.filter((z) => z.status === 'offen' && (OHNE_WEG_ARTEN as readonly string[]).includes(z.art)).map((z) => z.t))
const kuratiert = readdirSync('data/curated')
  .filter((f) => f.endsWith('.yaml'))
  .map((datei) => ({ datei, roh: yaml.load(readFileSync(`data/curated/${datei}`, 'utf8')) }))
  .map(({ datei, roh }) => ({ datei, eintraege: (Array.isArray(roh) ? roh : []) as KuratierterEintrag[] }))
const belege = ladeHandbelege()
const funde = keinWegTrotzQuelle({ offen, releases, kuratiert, belege, neinGilt: baueNeinGilt(belege), heute: todayIso() })

for (const f of funde) console[f.rot ? 'error' : 'log'](`  ${f.rot ? '✖' : '⚠ WARNUNG'} ${f.titleId} ohne Weg offen, aber ${f.platform} laut ${f.quelle}`)
const rot = funde.filter((f) => f.rot).length
if (rot) {
  console.error(`check-kein-weg-trotz-quelle-bestand: ${rot} Titel ohne Weg trotz sicherem Termin — Bauphase 11-7 (Wege aus Terminen) oder die Zuordnung des Termins prüfen`)
  process.exit(1)
}
console.log(`check-kein-weg-trotz-quelle-bestand: ok (${offen.size} Titel ohne Weg offen, ${releases.length} Releases, ${kuratiert.length} kuratierte Dateien, ${funde.length} Warnung(en))`)
