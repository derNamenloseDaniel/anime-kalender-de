/** Spur des Prime-Durchgangs: letzte 80 plus jeder Eintrag mit `ok: false`. */
const { readFileSync } = require('node:fs')
const vm = require('node:vm')

const kontext = vm.createContext({})
kontext.globalThis = kontext
vm.runInContext(readFileSync(__dirname + '/prime-titelseite.js', 'utf8'), kontext)
const kuerzen = kontext.akPrimeSpurKuerzen

let rot = 0
const pruefe = (name, ok, was) => {
  if (!ok) {
    rot++
    console.error('ROT:', name, was === undefined ? '' : JSON.stringify(was))
  }
}

const eintraege = (n) => Array.from({ length: n }, (_, i) => ({ was: 'seite', nr: i, ok: true }))

const kurz = kuerzen(eintraege(100))
pruefe('100 Einträge ohne Fehler → die letzten 80', kurz.length === 80 && kurz[0].nr === 20 && kurz[79].nr === 99, kurz.length)

const mit = eintraege(100)
mit[3].ok = false
mit[10].ok = false
const r = kuerzen(mit)
pruefe('zwei alte Fehler bleiben zusätzlich zu den letzten 80', r.length === 82 && r[0].nr === 3 && r[1].nr === 10 && r[2].nr === 20, r.map((e) => e.nr).slice(0, 4))

pruefe('Eintrag ohne Feld `ok` zählt nicht als Fehler', kuerzen([{ was: 'frame' }, ...eintraege(80)]).length === 80)
pruefe('kurze Spur bleibt unverändert', kuerzen(eintraege(5)).length === 5)

const viele = eintraege(300)
for (const i of [10, 60, 120, 180, 250]) viele[i].ok = false
const v = kuerzen(viele).map((e) => e.nr)
const erwartet = viele.filter((e, i) => i >= 220 || e.ok === false).map((e) => e.nr)
pruefe('300 Einträge, 5 Fehler → 80 jüngste plus alle 5 Fehler, Reihenfolge erhalten', JSON.stringify(v) === JSON.stringify(erwartet) && v.length === 84, v.length)

const fehler = eintraege(1000).map((e) => ({ ...e, ok: false }))
const f = kuerzen(fehler)
pruefe('Fehler wachsen nicht ins Endlose: höchstens 200 Fehler, die jüngsten bleiben', f.length === 200 && f[0].nr === 800 && f[199].nr === 999, [f.length, f[0]?.nr])

if (rot) process.exit(1)
console.log('prime-spur: grün')
