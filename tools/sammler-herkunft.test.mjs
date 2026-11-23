/**
 * Test für tools/sammler-herkunft.mjs und die Schuldigenliste (`quarantaene.mjs schuldige`): Rücknahme nur der Sammler-Dateien, in denen
 * sich der Eintrag eines schuldigen Titels geändert hat. Echtes git im Wegwerf-Repo unter os.tmpdir(), Attrappen-Bau ohne Netz und ohne data/cache.
 * Fixture je Rolle mehrfach: zwei schuldige Titel aus zwei Quellen (20 → toggo, 30 → tmdb-banner), unschuldige Titel (21 in einer schuldigen Datei,
 * 50 in einer Datei ohne schuldigen Titel) und ein schuldiger Titel ohne bekannte Quelle (99).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { HERKUNFT, eintraege, ordneZu, waehle, auswahlZeile, liesSchuldige } from './sammler-herkunft.mjs'
import { zuruecknehmen, SAMMLER } from './sammler-zuruecknehmen.mjs'
import { schuldigenPfad, schuldigeTitel } from './quarantaene.mjs'

const hier = path.dirname(fileURLToPath(import.meta.url))
const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'szh-'))
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim()
const schreibe = (cwd, datei, text) => {
  fs.mkdirSync(path.dirname(path.join(cwd, datei)), { recursive: true })
  fs.writeFileSync(path.join(cwd, datei), text)
}
const lies = (cwd, datei) => fs.readFileSync(path.join(cwd, datei), 'utf8')
function commit(cwd, autor, text, dateien) {
  for (const [d, t] of Object.entries(dateien)) {
    schreibe(cwd, d, t)
    git(cwd, 'add', d)
  }
  git(cwd, '-c', `user.name=${autor}`, '-c', 'user.email=x@example.org', 'commit', '-q', '-m', text)
  return git(cwd, 'rev-parse', 'HEAD')
}
const json = (o) => JSON.stringify(o)

// Basis: grüner Bau. Danach ändert der Sammler vier Quellen (toggo 20, tmdb-banner 30+31, trailer 50, proposals ohne Titelkennung).
let zaehler = 0
// `mitProposals: false` lässt die Datei ohne Herkunftsregel weg (dann deckt die enge Auswahl alle Sammler-Dateien ab).
// Neue Sammler-Datei (nicht in der Basis): data/tmdb-staffel0.json mit Titel 70.
function szenario(mitProposals = true) {
  const cwd = path.join(wurzel, `fall-${++zaehler}`)
  fs.mkdirSync(cwd)
  git(cwd, 'init', '-q', '-b', 'main')
  const basis = commit(cwd, 'Daniel', 'basis', {
    'data/toggo.json': json({ geholtAm: 'a', titel: { 20: { serie: 'gut' }, 21: { serie: 'ruhig' } } }),
    'data/tmdb-banner.json': json({ 30: 'gut', 31: 'gut' }),
    'data/trailer.json': json({ 50: 'gut' }),
    'data/proposals/anime2you.json': json(['a', 'b', 'c']),
  })
  commit(cwd, SAMMLER, 'chore(data): gesammelt', {
    'data/toggo.json': json({ geholtAm: 'b', titel: { 20: { serie: 'schlecht' }, 21: { serie: 'ruhig' } } }),
    'data/tmdb-banner.json': json({ 30: 'schlecht', 31: 'anders' }),
    'data/trailer.json': json({ 50: 'neu' }),
    ...(mitProposals ? { 'data/proposals/anime2you.json': json(['a']) } : {}),
    'data/tmdb-staffel0.json': json({ 70: { titel: 'neu' } }),
  })
  return { cwd, basis }
}
const nimm = (cwd) => (d) => JSON.parse(lies(cwd, d))
// Attrappen-Bau: rot, solange einer der schlechten Werte oder (Ursache woanders) das geschrumpfte proposals-Objekt steht.
const bau = (cwd, mitProposals = false) => () => {
  const t = nimm(cwd)
  const rot = t('data/toggo.json').titel[20].serie === 'schlecht' || t('data/tmdb-banner.json')[30] === 'schlecht'
  return !rot && !(mitProposals && t('data/proposals/anime2you.json').length < 3)
}

// 1. Auslesen der Kennungen: Schlüssel unter einem Pfad, Feld titleId (mehrere Einträge je Kennung), unerwartete Form, fremde Schlüssel.
{
  const toggo = HERKUNFT.find((h) => h.datei === 'data/toggo.json')
  assert.deepEqual([...eintraege({ titel: { 20: 'a', 21: 'b', zwanzig: 'c', '-5': 'd' } }, toggo).keys()].sort((a, b) => a - b), [-5, 20, 21])
  assert.equal(eintraege({ titel: [1, 2] }, toggo).size, 2, 'Feldnummern eines Arrays sind Zahlenschlüssel')
  assert.equal(eintraege({ andere: { 20: 'a' } }, toggo).size, 0, 'fehlender Pfad: leer, nie geraten')
  assert.equal(eintraege(null, toggo).size, 0)
  const tv = HERKUNFT.find((h) => h.datei.endsWith('/tv-' + 'programm.json'))
  const karte = eintraege({ sendungen: { a: { titleId: 7, start: 1 }, b: { titleId: 8 }, c: { titleId: 7, start: 2 }, d: { titel: 'ohne' }, e: { titleId: 'x' } } }, tv)
  assert.deepEqual([...karte.keys()], [7, 8])
  assert.equal(karte.get(7), json([{ titleId: 7, start: 1 }, { titleId: 7, start: 2 }]))
  assert.deepEqual([...eintraege({ sendungen: { a: { titleId: 7 }, n: null } }, tv).keys()], [7], 'ein leerer Eintrag bricht das Auslesen nicht')
  // Gemessene Form der echten Dateien (23.11.2026, Skript regel-probe): Kennungen liegen unter diesem Schlüssel, sonst am Wurzelschlüssel.
  const UNTER = { 'toggo.json': 'titel', 'motn.json': 'gesucht', 'rtlplus-folgen.json': 'titel', 'wikipedia-folgen.json': 'titel', 'crunchyroll-de-kennungen.json': 'kennungen', 'tv-programm.json': 'sendungen' }
  for (const h of HERKUNFT) assert.equal(h.unter, UNTER[h.datei.slice(['data', ''].join('/').length)], `${h.datei}: Ebene der Kennungen`)
  // Jede Regel liest die Kennung 7 an genau der Stelle, die sie nennt, und nirgends sonst.
  for (const h of HERKUNFT) {
    const inhalt = h.schluessel ? { 7: 'x' } : { a: { [h.feld]: 7 } }
    assert.deepEqual([...eintraege(h.unter ? { [h.unter]: inhalt } : inhalt, h).keys()], [7], `${h.datei}: Kennung an der genannten Stelle`)
    if (h.unter) assert.equal(eintraege(inhalt, h).size, 0, `${h.datei}: Kennung auf der falschen Ebene zählt nicht`)
  }
}

// 2. Zuordnung mit Einspeisung: zwei schuldige Titel aus zwei Quellen, unschuldige bleiben draußen, Titel ohne Quelle steht in `unbekannt`.
{
  const paare = {
    'data/toggo.json': { alt: { titel: { 20: 'gut', 21: 'x' } }, neu: { titel: { 20: 'schlecht', 21: 'x' } } },
    'data/tmdb-banner.json': { alt: { 30: 'gut', 31: 'gut' }, neu: { 30: 'schlecht', 31: 'anders' } },
    'data/trailer.json': { alt: { 50: 'gut' }, neu: { 50: 'neu' } },
    'data/tmdb-titles.json': { alt: null, neu: { 60: 'neue Datei' } },
  }
  const lese = (d) => paare[d]
  const dateien = [...Object.keys(paare), 'data/proposals/anime2you.json']
  const z = ordneZu({ schuldige: [20, 30, 60, 99], dateien, lies: lese })
  assert.deepEqual(z.belegt, { 20: ['data/toggo.json'], 30: ['data/tmdb-banner.json'], 60: ['data/tmdb-titles.json'], 99: [] })
  assert.deepEqual(z.eng, ['data/tmdb-banner.json', 'data/tmdb-titles.json', 'data/toggo.json'])
  assert.deepEqual(z.unbekannt, [99])
  assert.deepEqual(z.ohneHerkunft, ['data/proposals/anime2you.json'])
  // Ein Titel, dessen Eintrag in keiner Datei geändert wurde (21), zählt als unbekannt, nicht als „schuldig, weil in der Datei“.
  assert.deepEqual(ordneZu({ schuldige: [21], dateien, lies: lese }).unbekannt, [21])
  // Die Form der Datei zählt: trailer.json trägt Kennungen am Wurzelschlüssel, ein Unterobjekt `titel` zählt dort nicht.
  const zwei = ordneZu({ schuldige: [20], dateien: ['data/toggo.json', 'data/trailer.json'], lies: () => ({ alt: { titel: { 20: 'a' } }, neu: { titel: { 20: 'b' } } }) })
  assert.deepEqual(zwei.belegt[20], ['data/toggo.json'])
  // Gelöschter Eintrag (alt da, neu weg) ist eine Änderung.
  assert.deepEqual(ordneZu({ schuldige: [30], dateien: ['data/tmdb-banner.json'], lies: () => ({ alt: { 30: 'gut' }, neu: {} }) }).belegt[30], ['data/tmdb-banner.json'])
}

// 3. Wahl: eng nur ohne Zweifel; jeder Zweifel ergibt „alle“ mit benanntem Grund.
{
  const dateien = ['data/toggo.json', 'data/tmdb-banner.json', 'data/trailer.json']
  const lese = (d) => ({ 'data/toggo.json': { alt: { titel: { 20: 1 } }, neu: { titel: { 20: 2 } } }, 'data/tmdb-banner.json': { alt: { 30: 1 }, neu: { 30: 2 } }, 'data/trailer.json': { alt: { 50: 1 }, neu: { 50: 2 } } })[d]
  const eng = waehle({ schuldige: [20, 30], dateien, lies: lese })
  assert.equal(eng.art, 'eng')
  assert.deepEqual(eng.zuordnung.eng, ['data/tmdb-banner.json', 'data/toggo.json'])
  assert.equal(waehle({ schuldige: null, dateien, lies: lese }).grund, 'keine Schuldigenliste')
  assert.equal(waehle({ schuldige: [], dateien, lies: lese }).art, 'alle')
  const unbekannt = waehle({ schuldige: [20, 99], dateien, lies: lese })
  assert.deepEqual([unbekannt.art, unbekannt.grund], ['alle', 'Titel ohne belegte Quelle: 99'])
  assert.match(auswahlZeile({ ...unbekannt, zahlAlle: 3, engRot: false }), /Zuordnung: 20 → data\/toggo\.json; 99 → \?;/, 'auch beim Rückfall steht die Zuordnung im Log')
  const kaputt = waehle({ schuldige: [20], dateien, lies: (d) => { if (d === 'data/trailer.json') throw new Error('kein JSON'); return lese(d) } })
  assert.deepEqual([kaputt.art, kaputt.grund], ['alle', 'Datei unlesbar: data/trailer.json'])
  const zeile = auswahlZeile({ ...eng, zahlAlle: 3, engRot: false })
  assert.equal(zeile, 'Sammler-Zurücknahme Auswahl: eng (2 von 3 Dateien), Grund: 2 schuldige Titel belegt; Zuordnung: 20 → data/toggo.json; 30 → data/tmdb-banner.json; 0 unlesbar; 0 Dateien ohne Herkunftsregel')
  assert.match(auswahlZeile({ ...kaputt, zahlAlle: 3, engRot: true }), /alle \(3 von 3 Dateien\).*1 unlesbar: data\/trailer\.json.*enge Auswahl blieb rot, alle Dateien genommen$/)
  // Mehrere Namen je Verwerfungspfad stehen alle im Grund und in der Zeile, getrennt wie dokumentiert.
  assert.equal(waehle({ schuldige: [20, 98, 99], dateien, lies: lese }).grund, 'Titel ohne belegte Quelle: 98, 99')
  const zwei = waehle({ schuldige: [20], dateien, lies: (d) => { if (d !== 'data/toggo.json') throw new Error('kein JSON'); return lese(d) } })
  assert.equal(zwei.grund, 'Datei unlesbar: data/tmdb-banner.json, data/trailer.json')
  assert.match(auswahlZeile({ ...zwei, zahlAlle: 3, engRot: false }), /2 unlesbar: data\/tmdb-banner\.json, data\/trailer\.json/)
  const doppelt = waehle({ schuldige: [20], dateien: ['data/toggo.json', 'data/trailer.json'], lies: (d) => (d === 'data/toggo.json' ? { alt: { titel: { 20: 1 } }, neu: { titel: { 20: 2 } } } : { alt: { 20: 1 }, neu: { 20: 2 } }) })
  assert.match(auswahlZeile({ ...doppelt, zahlAlle: 2, engRot: false }), /20 → data\/toggo\.json\+data\/trailer\.json;/)
  assert.equal(auswahlZeile({ art: 'alle', grund: 'keine Schuldigenliste', zahlAlle: 3, engRot: false }), 'Sammler-Zurücknahme Auswahl: alle (3 von 3 Dateien), Grund: keine Schuldigenliste; Zuordnung: -; 0 unlesbar; 0 Dateien ohne Herkunftsregel')
}

// 4. Echtes git, enge Rücknahme: nur toggo und tmdb-banner gehen auf Basis zurück; trailer (nur unschuldiger Titel) und proposals bleiben.
{
  const { cwd, basis } = szenario()
  const commits = []
  const e = zuruecknehmen({ cwd, basis, schuldige: [20, 30], bauen: bau(cwd), committen: (t) => { commits.push(t); return true } })
  assert.equal(e.art, 'zurueckgenommen')
  assert.deepEqual(e.dateien, ['data/tmdb-banner.json', 'data/toggo.json'])
  assert.equal(e.wahl.art, 'eng')
  assert.equal(e.wahl.engRot, false)
  assert.equal(lies(cwd, 'data/toggo.json'), json({ geholtAm: 'a', titel: { 20: { serie: 'gut' }, 21: { serie: 'ruhig' } } }))
  assert.equal(lies(cwd, 'data/tmdb-banner.json'), json({ 30: 'gut', 31: 'gut' }), '31 war nicht schuldig, die Datei geht trotzdem als Ganzes zurück')
  assert.equal(lies(cwd, 'data/trailer.json'), json({ 50: 'neu' }), 'Datei ohne schuldigen Titel bleibt beim Sammler-Stand')
  assert.equal(lies(cwd, 'data/proposals/anime2you.json'), json(['a']), 'Datei ohne Herkunftsregel bleibt bei enger Auswahl')
  assert.equal(commits.length, 1)
  assert.match(commits[0], /^chore\(data\): Sammler-Stand zurückgenommen \([0-9a-f]{8}\)$/)
  // Ein Titel, dessen Eintrag seit der Basis gleich blieb (21, nur Nachbar 20 änderte sich), ist nicht belegt: alle Dateien.
  const gleich = szenario()
  const g = zuruecknehmen({ cwd: gleich.cwd, basis: gleich.basis, schuldige: [21], bauen: () => true, committen: () => true })
  assert.deepEqual([g.wahl.art, g.wahl.grund, g.dateien.length], ['alle', 'Titel ohne belegte Quelle: 21', 5])
  // 4b. Neue Sammler-Datei (in der Basis nicht vorhanden): der Titel 70 gilt als geändert, die Datei wird bei der Rücknahme entfernt.
  const neu = szenario()
  const n = zuruecknehmen({ cwd: neu.cwd, basis: neu.basis, schuldige: [70], bauen: () => true, committen: () => true })
  assert.deepEqual([n.wahl.art, n.dateien], ['eng', ['data/tmdb-staffel0.json']])
  assert.equal(fs.existsSync(path.join(neu.cwd, 'data/tmdb-staffel0.json')), false)
}

// 5. Schuldiger Titel ohne bekannte Quelle: sofort alle Dateien wie bisher, ein Bau-Versuch.
{
  const { cwd, basis } = szenario()
  let gebaut = 0
  const e = zuruecknehmen({ cwd, basis, schuldige: [20, 99], bauen: () => { gebaut++; return bau(cwd)() }, committen: () => true })
  assert.equal(e.art, 'zurueckgenommen')
  assert.deepEqual(e.dateien, ['data/proposals/anime2you.json', 'data/tmdb-banner.json', 'data/tmdb-staffel0.json', 'data/toggo.json', 'data/trailer.json'])
  assert.equal(gebaut, 1)
  assert.equal(e.wahl.grund, 'Titel ohne belegte Quelle: 99')
  assert.equal(lies(cwd, 'data/trailer.json'), json({ 50: 'gut' }))
}

// 6. Enge Auswahl bleibt rot (Ursache auch in proposals): zweite Stufe nimmt alle Dateien, Zustand der ersten Stufe ist vorher zurückgesetzt.
{
  const { cwd, basis } = szenario()
  const stande = []
  const e = zuruecknehmen({
    cwd,
    basis,
    schuldige: [20, 30],
    bauen: () => { stande.push(lies(cwd, 'data/trailer.json')); return bau(cwd, true)() },
    committen: () => true,
  })
  assert.equal(e.art, 'zurueckgenommen')
  assert.deepEqual(stande, [json({ 50: 'neu' }), json({ 50: 'gut' })], 'erster Bau mit enger, zweiter mit voller Auswahl')
  assert.equal(e.dateien.length, 5)
  assert.equal(e.wahl.engRot, true)
  assert.match(auswahlZeile(e.wahl), /eng \(2 von 5 Dateien\).*enge Auswahl blieb rot, alle Dateien genommen$/)
  // Bleibt auch die volle Auswahl rot: alles wieder auf HEAD.
  const rot = szenario()
  const r = zuruecknehmen({ cwd: rot.cwd, basis: rot.basis, schuldige: [20, 30], bauen: () => false, committen: () => true })
  assert.equal(r.art, 'bleibt-rot')
  assert.equal(r.wahl.engRot, true)
  assert.equal(r.dateien.length, 5)
  assert.deepEqual(r.ausgelassen, { fremd: [], keinDatenpfad: [], ruecknahmen: 0 })
  assert.equal(git(rot.cwd, 'status', '--porcelain'), '')
  // 6b. Deckt die enge Auswahl schon alle Sammler-Dateien ab, gibt es keinen zweiten Versuch mit derselben Menge.
  const gleich = szenario(false)
  let gebaut = 0
  const g = zuruecknehmen({ cwd: gleich.cwd, basis: gleich.basis, schuldige: [20, 30, 50, 70], bauen: () => { gebaut++; return false }, committen: () => true })
  assert.deepEqual([g.art, gebaut, g.wahl.engRot, g.dateien.length], ['bleibt-rot', 1, false, 4])
}

// 7. Ohne Liste, mit leerer Liste und mit unlesbarer Datei: wie bisher alle Dateien.
{
  for (const schuldige of [null, []]) {
    const { cwd, basis } = szenario()
    const e = zuruecknehmen({ cwd, basis, schuldige, bauen: bau(cwd), committen: () => true })
    assert.equal(e.dateien.length, 5)
    assert.equal(e.wahl.art, 'alle')
    // Bleibt auch dieser Bau rot, ist die enge Auswahl nie versucht worden.
    const rot = szenario()
    const r = zuruecknehmen({ cwd: rot.cwd, basis: rot.basis, schuldige, bauen: () => false, committen: () => true })
    assert.deepEqual([r.art, r.wahl.engRot], ['bleibt-rot', false])
  }
  const { cwd, basis } = szenario()
  schreibe(cwd, 'data/trailer.json', '{kaputt')
  git(cwd, 'add', 'data/trailer.json')
  git(cwd, '-c', `user.name=${SAMMLER}`, '-c', 'user.email=x@example.org', 'commit', '-q', '-m', 'kaputt')
  const e = zuruecknehmen({ cwd, basis, schuldige: [20], bauen: bau(cwd), committen: () => true })
  assert.match(e.wahl.grund, /^Datei unlesbar: data\/trailer\.json$/)
  assert.equal(e.dateien.length, 5)
}

// 7b. Keine und genau eine Sammler-Datei in der Spanne.
{
  const cwd = path.join(wurzel, 'klein')
  fs.mkdirSync(cwd)
  git(cwd, 'init', '-q', '-b', 'main')
  const basis = commit(cwd, 'Daniel', 'basis', { 'data/toggo.json': json({ titel: { 20: 1 } }) })
  commit(cwd, 'Daniel', 'mensch', { 'pipeline/x.ts': 'x' })
  const keine = zuruecknehmen({ cwd, basis, schuldige: [20], bauen: () => true, committen: () => true })
  assert.deepEqual([keine.art, keine.dateien, keine.wahl], ['nichts', [], null])
  commit(cwd, SAMMLER, 'gesammelt', { 'data/toggo.json': json({ titel: { 20: 2 } }) })
  const eine = zuruecknehmen({ cwd, basis, schuldige: [20], bauen: () => true, committen: () => true })
  assert.deepEqual([eine.art, eine.dateien, eine.wahl.art], ['zurueckgenommen', ['data/toggo.json'], 'eng'])
}

// 8. Schuldigenliste: Pfad, Vereinigung mit früher Zurückgestellten, Lesen mit allen Weigerungsgründen.
{
  assert.equal(schuldigenPfad({ RUNNER_TEMP: '/r' }), path.join('/r', 'bau-schuldige.json'))
  assert.equal(schuldigenPfad({}), path.join(os.tmpdir(), 'bau-schuldige.json'))
  const m = (titleId, pruefung) => ({ titleId, pruefung, grund: 'g' })
  assert.deepEqual(schuldigeTitel([m(30, 'b'), m(20, 'b')], [m(20, 'a'), m(10, 'a')]).map((e) => `${e.titleId}${e.pruefung}`), ['10a', '20a', '30b'])
  const env = { RUNNER_TEMP: '/r', GITHUB_RUN_ID: '7' }
  const liste = (o) => () => JSON.stringify(o)
  assert.deepEqual(liesSchuldige(env, liste({ laufId: '7', schuldige: [{ titleId: 30 }, { titleId: 20 }, { titleId: 30 }, { titleId: 'x' }] })), { ids: [20, 30], grund: '' })
  assert.match(liesSchuldige(env, () => { throw new Error('ENOENT') }).grund, /^keine Schuldigenliste/)
  assert.equal(liesSchuldige(env, () => { throw new Error('ENOENT') }).ids, null)
  assert.equal(liesSchuldige(env, () => 'kein json').grund, 'Schuldigenliste unlesbar')
  assert.equal(liesSchuldige(env, () => 'kein json').ids, null)
  assert.deepEqual(liesSchuldige(env, liste({ laufId: '7', schuldige: [{ titleId: 10 }, { titleId: 9 }] })).ids, [9, 10], 'Zahlen, nicht Text, sortiert')
  assert.equal(liesSchuldige(env, liste({ laufId: '7' })).grund, 'Schuldigenliste unlesbar', 'fehlendes Feld schuldige')
  assert.deepEqual(liesSchuldige(env, liste({ laufId: '8', schuldige: [{ titleId: 20 }] })), { ids: null, grund: 'Schuldigenliste gehört zu Lauf 8, nicht zu 7' })
  assert.deepEqual(liesSchuldige({ RUNNER_TEMP: '/r' }, liste({ laufId: '8', schuldige: [{ titleId: 20 }] })).ids, null, 'ohne Lauf-Kennung gilt eine fremde nicht')
  assert.deepEqual(liesSchuldige(env, liste({ laufId: '7', schuldige: [] })), { ids: [], grund: 'Schuldigenliste ohne Titelkennung' })
}

// 9. Prozess, ganzer Weg: Attrappen-Bau druckt Marken beim Abbruch → `quarantaene.mjs schuldige` → `sammler-zuruecknehmen.mjs` liest die Liste.
{
  const { cwd, basis } = szenario()
  const rt = path.join(wurzel, 'rt')
  fs.mkdirSync(rt)
  const protokoll = path.join(wurzel, 'bestand-pruefung.txt')
  const marke = (id, p) => `QUARANTAENE ${json({ titleId: id, pruefung: p, grund: 'g' })}`
  fs.writeFileSync(protokoll, ['✗ Titel rot', marke(20, 'toggo-pruefung'), '  ' + marke(30, 'banner-pruefung'), 'QUARANTAENE {kaputt', ''].join('\n'))
  const env = { ...process.env, RUNNER_TEMP: rt, GITHUB_RUN_ID: '4242' }
  const ablegen = spawnSync(process.execPath, [path.join(hier, 'quarantaene.mjs'), 'schuldige', protokoll], { cwd: wurzel, env, encoding: 'utf8', windowsHide: true, timeout: 30000 })
  assert.equal(ablegen.status, 0, ablegen.stderr)
  assert.match(ablegen.stdout, /^Schuldige Titel des Abbruchs: 20 \(toggo-pruefung\), 30 \(banner-pruefung\)\n$/)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(rt, 'bau-schuldige.json'), 'utf8')).schuldige.map((e) => e.titleId), [20, 30])
  // Ohne Protokoll: Aufruffehler (Exit 2), keine Datei überschrieben; mit früher zurückgestellten Titeln: deren Eintrag (Prüfung) gewinnt, je Kennung einmal.
  const ohne = spawnSync(process.execPath, [path.join(hier, 'quarantaene.mjs'), 'schuldige'], { cwd: wurzel, env, encoding: 'utf8', windowsHide: true, timeout: 30000 })
  assert.equal(ohne.status, 2)
  assert.match(ohne.stdout, /^Aufruf: node tools\/quarantaene\.mjs sammeln .* \| schuldige <prüfprotokoll> \[<liste\.json>\]\n$/)
  const vorher = path.join(wurzel, 'quarantaene.json')
  fs.writeFileSync(vorher, json([{ titleId: 20, pruefung: 'schon-zurueckgestellt', grund: 'g' }, { titleId: 10, pruefung: 'alt', grund: 'g' }]))
  const mit = spawnSync(process.execPath, [path.join(hier, 'quarantaene.mjs'), 'schuldige', protokoll, vorher], { cwd: wurzel, env, encoding: 'utf8', windowsHide: true, timeout: 30000 })
  assert.equal(mit.status, 0, mit.stderr)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(rt, 'bau-schuldige.json'), 'utf8')).schuldige.map((e) => `${e.titleId}:${e.pruefung}`), ['10:alt', '20:schon-zurueckgestellt', '30:banner-pruefung'])
  spawnSync(process.execPath, [path.join(hier, 'quarantaene.mjs'), 'schuldige', protokoll], { cwd: wurzel, env, encoding: 'utf8', windowsHide: true, timeout: 30000 })
  const fake = path.join(wurzel, 'fake-bau.mjs')
  fs.writeFileSync(fake, [
    "import fs from 'node:fs'",
    "const t = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))",
    "const rot = t('data/toggo.json').titel[20].serie === 'schlecht' || t('data/tmdb-banner.json')[30] === 'schlecht'",
    "if (process.argv[2] === 'bau') process.exit(rot ? 1 : 0)",
    "fs.appendFileSync('commit-aufrufe.txt', process.env.SZN_NACHRICHT + '\\n')",
  ].join('\n'))
  const lauf = (extra) => spawnSync(process.execPath, [path.join(hier, 'sammler-zuruecknehmen.mjs'), '--basis', basis], { cwd, env: { ...env, SZN_BAU: `node "${fake}" bau`, SZN_COMMIT: `node "${fake}" commit`, ...extra }, encoding: 'utf8', windowsHide: true, timeout: 60000 })
  // Anderer Lauf (Rest von früher): Liste gilt nicht, alle Dateien.
  const fremd = lauf({ GITHUB_RUN_ID: '9999' })
  assert.equal(fremd.status, 0, fremd.stderr)
  assert.match(fremd.stdout, /^Sammler-Zurücknahme: Schuldigenliste gehört zu Lauf 4242, nicht zu 9999, es gelten alle Sammler-Dateien$/m)
  assert.match(fremd.stdout, /Sammler-Zurücknahme: zurueckgenommen \(5 Dateien/)
  git(cwd, 'reset', '-q', '--hard', 'HEAD')
  git(cwd, 'clean', '-fdq')
  const r = lauf({})
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /Sammler-Zurücknahme Auswahl: eng \(2 von 5 Dateien\), Grund: 2 schuldige Titel belegt; Zuordnung: 20 → data\/toggo\.json; 30 → data\/tmdb-banner\.json; 0 unlesbar; 1 Dateien ohne Herkunftsregel: data\/proposals\/anime2you\.json$/m)
  assert.match(r.stdout, /Sammler-Zurücknahme: zurueckgenommen \(2 Dateien: data\/tmdb-banner\.json, data\/toggo\.json\)/)
  assert.equal(lies(cwd, 'data/trailer.json'), json({ 50: 'neu' }))
  assert.equal(lies(cwd, 'data/toggo.json').includes('schlecht'), false)
}

// 10. Die Herkunftsregeln: jede Datei ist ein Sammler-Ziel (tools/quellen-liste.sh), keine doppelt, jede mit gültiger Form.
{
  const quellen = fs.readFileSync(path.join(hier, 'quellen-liste.sh'), 'utf8')
  for (const h of HERKUNFT) {
    assert.ok(quellen.split('\n').some((z) => z.trim() === h.datei), `${h.datei} steht nicht in quellen-liste.sh`)
    assert.ok(h.schluessel === true || typeof h.feld === 'string', `${h.datei}: weder schluessel noch feld`)
  }
  assert.equal(new Set(HERKUNFT.map((h) => h.datei)).size, HERKUNFT.length)
  assert.ok(HERKUNFT.length >= 15)
}

fs.rmSync(wurzel, { recursive: true, force: true })
console.log('sammler-herkunft.test: ok (Auslesen, Zuordnung, Wahl, enge und volle Rücknahme am echten git, Schuldigenliste, Prozess über Marken bis Rücknahme)')
