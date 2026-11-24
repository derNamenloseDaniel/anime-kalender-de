/**
 * Prozesstest von `check-toggo-seiten-bestand.ts`: das echte Skript läuft als eigener Prozess in einer Wegwerf-Wurzel (`AK_ROOT`, Arbeitsordner
 * mit eigener `titles.json`, `cartoons.json`, `data/toggo.json`), je Fall wird genau eine Größe verfälscht. Handliste und Staffelgrenzen sind die
 * echten Dateien; der Katalog entsteht aus der Handliste (eine Serie je Eintrag, dazu Füllserien). Dazu: der Wächter steht in der Bestandsliste.
 * Läuft in `check:logic`.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'

const REPO = resolve(import.meta.dirname, '..')
const tsx = pathToFileURL(join(REPO, 'node_modules/tsx/dist/esm/index.mjs')).href
const SKRIPT = 'pipeline/check-toggo-seiten-bestand.ts'
const B = 'https://www.toggo.de'

type Hand = { pokemon: { staffel: number; serie: string; titel?: number[] }[] }
type Grenzen = { titel: { anilistId: number; staffeln: { nr: number }[] }[] }
const hand = yaml.load(readFileSync(join(REPO, 'data/curated/toggo-seiten.yaml'), 'utf8')) as Hand
const grenzen = yaml.load(readFileSync(join(REPO, 'data/curated/pokemon-staffeln.yaml'), 'utf8')) as Grenzen

/** Die richtige Seite je Pokémon-Titel: die erste seiner Staffeln, aus der Handliste abgelesen (Staffel 16 nach Titelliste). */
const richtig = (id: number, nr: number) => `${B}/pokemon/serien/${hand.pokemon.find((h) => h.staffel === nr && (!h.titel || h.titel.includes(id)))!.serie}`
const titel = (ueberschreibe: Record<number, string | null> = {}) =>
  grenzen.titel.map((t) => {
    const url = t.anilistId in ueberschreibe ? ueberschreibe[t.anilistId] : richtig(t.anilistId, t.staffeln[0]!.nr)
    return { id: t.anilistId, titleEn: `Fixture ${t.anilistId}`, watchLinks: url ? [{ name: 'TOGGO', url, kind: 'stream', zugang: 'kostenlos' }] : [] }
  })
const katalog = (leer = false) => (leer ? [] : [
  ...hand.pokemon.map((h, i) => ({ id: `VSE${i}`, uname: h.serie, titel: h.serie, figuren: ['pokemon'], frei: true })),
  ...Array.from({ length: 120 }, (_, i) => ({ id: `VSE9${i}`, uname: `fuell-${i}`, titel: `Fülltitel ${i}`, figuren: [`fuell-${i}`], frei: true })),
])

type Kulisse = { pokemon?: Record<number, string | null>; leer?: boolean; stand?: { falsch: number; fehlend: number } }
function lauf(k: Kulisse): { status: number | null; aus: string } {
  const wurzel = mkdtempSync(join(tmpdir(), 'toggo-seiten-bestand-'))
  try {
    mkdirSync(join(wurzel, 'data/curated'), { recursive: true })
    mkdirSync(join(wurzel, 'public/data'), { recursive: true })
    mkdirSync(join(wurzel, 'tools'))
    for (const d of ['toggo-seiten.yaml', 'pokemon-staffeln.yaml']) cpSync(join(REPO, 'data/curated', d), join(wurzel, 'data/curated', d))
    writeFileSync(join(wurzel, 'data/toggo.json'), JSON.stringify({ katalog: katalog(k.leer), titel: {} }))
    writeFileSync(join(wurzel, 'public/data/titles.json'), JSON.stringify(titel(k.pokemon)))
    writeFileSync(join(wurzel, 'public/data/cartoons.json'), JSON.stringify([{ id: -900001, titleEn: 'Cartoon Fixture', watchLinks: [] }]))
    writeFileSync(join(wurzel, 'tools/toggo-seiten-stand.json'), JSON.stringify(k.stand ?? { falsch: 0, fehlend: 0 }))
    const r = spawnSync(process.execPath, ['--import', tsx, join(REPO, SKRIPT)], { cwd: wurzel, env: { ...process.env, AK_ROOT: wurzel }, encoding: 'utf8', timeout: 90_000 })
    return { status: r.status, aus: `${r.stdout}${r.stderr}` }
  } finally {
    rmSync(wurzel, { recursive: true, force: true })
  }
}

let fehler = 0
function fall(name: string, k: Kulisse, exit: 0 | 1, zeile: string, ohne?: string): void {
  const r = lauf(k)
  const ok = r.status === exit && r.aus.includes(zeile) && (!ohne || !r.aus.includes(ohne)) && !r.aus.includes('ENOENT')
  if (ok) return console.log(`  ✓ ${name}`)
  fehler++
  console.error(`  ✖ ${name}: Exit ${r.status}, erwartet ${exit} mit „${zeile}“\n${r.aus.slice(-1200)}`)
}

console.log('\nTOGGO-Seiten im Bestand (Prozess):')
fall('alle Pokémon-Titel auf der Seite ihrer ersten Staffel: grün', {}, 0, 'TOGGO-Seiten: 12 Titel und 1 Cartoons, Katalog 146 Serien, falsch 0 (Stand 0), fest fehlend 0', 'FEHLER')
fall('Pokémon 527 auf der Sammelseite (der Anlass): rot', { pokemon: { 527: `${B}/pokemon` } }, 1, 'FEHLER: 1 Titel mit einem TOGGO-Link, den der Bau noch ändert', 'FEHLER: 0')
fall('Pokémon 527 auf der Seite einer anderen Staffel: rot', { pokemon: { 527: richtig(1564, 6) } }, 1, 'Stand 0, nur sinken: 527')
fall('dieselbe Abweichung unter dem Stand (Ratsche): grün', { pokemon: { 527: `${B}/pokemon` }, stand: { falsch: 1, fehlend: 0 } }, 0, 'falsch 1 (Stand 1)', 'FEHLER')
fall('Pokémon 1564 ohne TOGGO-Link: rot', { pokemon: { 1564: null } }, 1, 'Pokémon-Staffeltitel oder Handeinträge ohne TOGGO-Link, Stand 0, nur sinken: 1564')
fall('Pokémon 1564 ohne Link unter dem Stand: grün', { pokemon: { 1564: null }, stand: { falsch: 0, fehlend: 1 } }, 0, 'fest fehlend 1 (Stand 1)', 'FEHLER')
fall('leerer Katalog: rot', { leer: true }, 1, 'TOGGO-Katalog in data/toggo.json hat 0 Serien')

const liste = readFileSync(join(REPO, 'tools/check-bestand-liste.txt'), 'utf8').split('\n')
if (liste.includes(SKRIPT)) console.log('  ✓ der Wächter steht in tools/check-bestand-liste.txt')
else {
  fehler++
  console.error('  ✖ der Wächter fehlt in tools/check-bestand-liste.txt')
}
console.log(fehler ? `\n${fehler} Fälle verletzt.` : '\nTOGGO-Seiten (Bestand): alle Fälle halten.')
process.exit(fehler ? 1 : 0)
