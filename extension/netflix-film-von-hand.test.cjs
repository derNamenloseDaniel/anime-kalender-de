/**
 * Ein Film von der Netflix-Prüfliste lässt sich von Hand melden (22.11.2026, Daniel an „One Piece Fan Letter“):
 * Er schaut den Film, kehrt auf die Titelseite zurück — der Knopf blieb abgeblendet („Nichts zu melden“), nur
 * „Alles durchgehen“ konnte melden. Gespielt wird das echte `melder.js` mit eingefrorenen Seitenzuständen; im
 * Player bleibt das Bild frei (Daniel, 30.08.2026), eine Serie bekommt keinen Handweg, fremde Tonspuren auch nicht.
 */
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { ladeSkripte, skripteBis } = require('./test-lader.cjs')
const vm = require('node:vm')

const faelle = []
const pruefe = (name, ok, gefunden) => {
  faelle.push(ok)
  console.log(ok ? `  ✓ ${name}` : `  ✖ ${name} — gefunden: ${JSON.stringify(gefunden)}`)
}

function klassenListe() {
  const menge = new Set()
  return {
    _: menge,
    add(...n) {
      n.forEach((x) => menge.add(x))
    },
    remove(...n) {
      n.forEach((x) => menge.delete(x))
    },
    toggle(n, an) {
      if (an) menge.add(n)
      else menge.delete(n)
    },
    contains: (n) => menge.has(n),
  }
}

function macheElement(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    isConnected: true,
    className: '',
    id: '',
    hidden: false,
    disabled: false,
    textContent: '',
    title: '',
    style: {},
    dataset: {},
    kinder: [],
    hoerer: [],
    attribute: new Map(),
    classList: klassenListe(),
    appendChild(k) {
      this.kinder.push(k)
      return k
    },
    append(...k) {
      this.kinder.push(...k)
    },
    insertBefore(k) {
      this.kinder.unshift(k)
      return k
    },
    contains(k) {
      return Boolean(k) && (k === this || this.kinder.some((x) => x === k || x.contains?.(k)))
    },
    remove() {
      this.isConnected = false
    },
    addEventListener(art, f) {
      if (art === 'click') this.hoerer.push(f)
    },
    querySelector(sel) {
      const klasse = String(sel).trim().split(/\s+/).pop().replace(/^\./, '')
      for (const k of this.kinder) {
        if (String(k?.className ?? '').split(/\s+/).includes(klasse)) return k
        const tiefer = k?.querySelector?.(sel)
        if (tiefer) return tiefer
      }
      return null
    },
    querySelectorAll: () => [],
    setAttribute(k, v) {
      this.attribute.set(k, String(v))
    },
    getAttribute(k) {
      return this.attribute.get(k) ?? null
    },
    removeAttribute(k) {
      this.attribute.delete(k)
    },
    after() {},
    removeEventListener() {},
    closest: () => null,
    click() {},
    focus() {},
    insertAdjacentHTML() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  }
  return el
}

const GLOBALE = [
  'URL',
  'URLSearchParams',
  'Date',
  'JSON',
  'Math',
  'Promise',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Set',
  'WeakMap',
  'Map',
  'Error',
  'RegExp',
  'isNaN',
  'parseInt',
  'parseFloat',
  'encodeURIComponent',
  'decodeURIComponent',
]
const BASIS = [
  'kontext.js',
  'box.js',
  'titel-bindung.js',
  'offene-netflix.js',
  'pruefstand-zeit.js',
  'disney-netz.js',
  'netflix-gemeldet.js',
  'netflix-durchgang-schutz.js',
  'netflix-uebernahme.js',
  'netflix-randvoll.js',
  'netflix-seitentreue.js',
  'netflix-staffel.js',
  'netflix-erinnern.js',
  'netflix-durchgang-steuerung.js',
  'netflix-zurueckgestellt.js',
  'netflix-staffelzaehlung.js',
]
const MANIFEST = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'))
const imManifest = MANIFEST.content_scripts.some(
  (c) => c.js.includes('netflix-film-knopf.js') && c.js.indexOf('netflix-film-knopf.js') < c.js.indexOf('melder.js'),
)

function dokumentNeu(body, dokumentCapture) {
  return {
    body,
    head: macheElement('head'),
    documentElement: macheElement('html'),
    readyState: 'complete',
    title: 'Netflix',
    kinder: [body],
    createElement: macheElement,
    createTextNode: (t) => ({ textContent: t }),
    addEventListener(art, f, capture) {
      if (art === 'click' && capture) dokumentCapture.push(f)
    },
    removeEventListener() {},
    dispatchEvent: () => true,
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: () => [],
    getElementById: () => null,
  }
}

const CHROME = {
  storage: {
    local: { get: async () => ({}), set: async () => {} },
    sync: { get: async () => ({ token: 'test-token' }), set: async () => {} },
    onChanged: { addListener() {}, removeListener() {} },
  },
  runtime: { getURL: (p) => p, id: 'test', onMessage: { addListener() {} } },
}

function seiteNeu(pfad) {
  const body = macheElement('body')
  body.innerText = 'Abspielen' /* kein „Erinnern“: der Titel ist abrufbar */
  const dokumentCapture = []
  const fensterCapture = []
  const meldungen = []
  const umgebung = {
    document: dokumentNeu(body, dokumentCapture),
    location: { pathname: pfad, search: '', href: `https://www.netflix.com${pfad}`, hostname: 'www.netflix.com' },
    navigator: { userAgent: 'test' },
    chrome: CHROME,
    console,
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: () => 0,
    fetch: async (url, opt) => {
      if (opt?.method === 'POST' && !String(url).endsWith('/vorfall')) meldungen.push(JSON.parse(opt.body))
      return { ok: true, json: async () => ({ ok: true, anbieter: [] }), text: async () => '' }
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    CustomEvent: class {},
    history: { pushState() {} },
    postMessage() {},
    ...Object.fromEntries(GLOBALE.map((n) => [n, globalThis[n]])),
    addEventListener(art, f, capture) {
      if (art === 'click' && capture) fensterCapture.push(f)
    },
    removeEventListener() {},
    dispatchEvent: () => true,
  }
  umgebung.window = umgebung
  umgebung.globalThis = umgebung
  umgebung.self = umgebung
  const kontext = vm.createContext(umgebung)
  const nur = imManifest ? [...BASIS, 'netflix-film-knopf.js', 'melder.js'] : [...BASIS, 'melder.js']
  ladeSkripte(kontext, skripteBis('melder.js', { nur }))
  const run = (c) => vm.runInContext(c, kontext)
  const klick = (ziel) => {
    const e = { target: ziel, stopPropagation() {}, preventDefault() {} }
    for (const stufe of [fensterCapture, dokumentCapture, ziel.hoerer]) {
      for (const f of [...stufe]) f(e)
    }
  }
  const warte = async () => {
    for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r))
  }
  return { run, klick, warte, meldungen }
}

const FILM = { titel: 'Test-Film', staffeln: [{ nr: 1, folgen: 1, film: true, offen: true, zustand: 'melden' }] }
const SERIE = { titel: 'Test-Serie', staffeln: [{ nr: 1, folgen: 12, erste: 1, film: false, offen: true, zustand: 'melden' }] }
const DEUTSCH = "[{ code: 'ja', name: 'Japanisch' }, { code: 'de', name: 'Deutsch' }]"
const bereit = (eintrag, reihe, spuren) =>
  [
    `offeneTitel['81234'] = ${JSON.stringify(eintrag)}`,
    `offeneTitel['99999'] = ${JSON.stringify(eintrag)}` /* auch der fremde Titel ist ein Film: nur die Adresse trennt */,
    `stand.reihe = '${reihe}'`,
    'stand.folgeNr = null',
    'stand.staffel = null',
    `stand.spuren = ${spuren}`,
    'knopfZeigen()',
  ].join('\n')

/** Eine frische Seite unter `pfad`, Zustand gesetzt, Knopf gezeichnet. */
async function zeichne(pfad, eintrag, reihe, spuren) {
  const s = seiteNeu(pfad)
  await s.warte()
  s.run(bereit(eintrag, reihe, spuren))
  return s
}

async function fall() {
  pruefe('Manifest lädt netflix-film-knopf.js vor melder.js', imManifest)

  const s = await zeichne('/title/81234', FILM, '81234', DEUTSCH)
  const knopf = s.run('knopf')
  const bietetAn = knopf && knopf.disabled === false && /^Film melden/.test(knopf.textContent)
  pruefe('Film nach dem Anschauen: Knopf bietet die Meldung an', bietetAn, knopf && { d: knopf.disabled, t: knopf.textContent })
  pruefe('Deutsch gehört: grün', knopf.classList.contains('ak-ja') && knopf.textContent === 'Film melden — Deutsch gehört', knopf.textContent)
  s.klick(knopf)
  await s.warte()
  const sprachen = s.meldungen.map((m) => m.sprachen)
  pruefe('Klick sendet genau eine Meldung mit Deutsch', s.meldungen.length === 1 && sprachen[0]?.includes('de|Deutsch'), sprachen)
  pruefe('Meldung trägt die Titelseite des Films', s.meldungen[0]?.url === 'https://www.netflix.com/title/81234', s.meldungen[0]?.url)

  const stumm = await zeichne('/title/81234', FILM, '81234', "[{ code: 'ja', name: 'Japanisch' }]")
  const kd = stumm.run('knopf')
  const keinDeutsch = kd.disabled === false && kd.classList.contains('ak-nein') && kd.textContent === 'Film melden — kein Deutsch'
  pruefe('Kein Deutsch: Knopf meldet es, rot', keinDeutsch, { t: kd.textContent, d: kd.disabled })
  stumm.klick(kd)
  await stumm.warte()
  pruefe('Kein-Deutsch-Meldung geht ohne „de“ raus', stumm.meldungen.length === 1 && stumm.meldungen[0].sprachen?.length === 1, stumm.meldungen.map((m) => m.sprachen))

  const ohne = await zeichne('/title/81234', FILM, '81234', 'null')
  pruefe('Film ohne gelesene Tonspuren: nichts anzubieten', ohne.run('knopf').disabled === true, ohne.run('knopf').textContent)

  const serie = await zeichne('/title/81234', SERIE, '81234', DEUTSCH)
  pruefe('Serie: kein Handweg (der Durchlauf meldet)', serie.run('knopf').disabled === true, serie.run('knopf').textContent)

  const fremd = await zeichne('/title/81234', FILM, '99999', DEUTSCH)
  pruefe('Tonspuren eines anderen Titels: nichts anzubieten', fremd.run('knopf')?.disabled !== false, fremd.run('knopf')?.textContent)

  const player = await zeichne('/watch/81234', FILM, '81234', DEUTSCH)
  pruefe('Im Player zeichnet die Erweiterung nichts', player.run('knopf') === null, player.run('knopf')?.textContent)
}

fall().then(() => {
  const rot = faelle.filter((x) => !x).length
  if (rot) {
    console.error(`\n${rot} Zusicherung(en) verletzt`)
    process.exit(1)
  }
  console.log(`\nalle ${faelle.length} Zusicherungen erfüllt`)
})
