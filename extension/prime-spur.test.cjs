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

if (rot) process.exit(1)
console.log('prime-spur: grün')
