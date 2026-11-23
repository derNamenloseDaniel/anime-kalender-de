/**
 * Ablauftest: `fetch-folgen-zuordnung.ts` und `fetch-urteile.ts` melden einen Abbruch als Vorfall (Folge 44).
 * Anlass: beide Schritte stehen im Bestandsbau mit `continue-on-error`; ein Wurf (Worker nicht erreichbar) blieb still.
 * Kulisse: echter Kindprozess mit fetch-Attrappe (kein Netz, kein `data/cache/`), `AK_ROOT` = Wegwerf-Ordner.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const pipeline = fileURLToPath(new URL('.', import.meta.url))
const ordner = mkdtempSync(join(tmpdir(), 'abbruch-fu-'))
const attrappe = join(ordner, 'fetch-attrappe.mjs')
writeFileSync(
  attrappe,
  `import { appendFileSync } from 'node:fs'
globalThis.fetch = async (url, opt) => {
  if (String(url).endsWith('/vorfall')) {
    appendFileSync(process.env.VORFALL_DATEI, JSON.stringify({ ziel: String(url), token: opt.headers['X-Lauf-Token'], ...JSON.parse(opt.body) }) + '\\n')
    return { ok: true, status: 200 }
  }
  throw new Error('Netz aus: ' + url)
}
`,
)

function fahre(skript: string, mitToken: boolean) {
  const datei = join(ordner, `vorfall-${skript}-${mitToken}.jsonl`)
  const env: NodeJS.ProcessEnv = { ...process.env, AK_ROOT: ordner, VORFALL_DATEI: datei, LAUF_WORKER: 'https://worker.test' }
  if (mitToken) env.LAUF_TOKEN = 'tok-900001'
  else delete env.LAUF_TOKEN
  const r = spawnSync(process.execPath, ['--import', 'tsx', '--import', attrappe, join(pipeline, skript), '--voll'], { env, encoding: 'utf8', timeout: 60000, windowsHide: true })
  const vorfaelle = existsSync(datei) ? readFileSync(datei, 'utf8').trim().split('\n').filter(Boolean).map((z) => JSON.parse(z) as Record<string, string>) : []
  return { status: r.status, text: `${r.stdout}${r.stderr}`, vorfaelle }
}

const faelle: [string, string][] = [
  ['fetch-folgen-zuordnung.ts', 'folgen-zuordnung'],
  ['fetch-urteile.ts', 'urteile'],
]
for (const [skript, art] of faelle) {
  const mit = fahre(skript, true)
  assert.notEqual(mit.status, 0, `${skript}: Abbruch bleibt ein Fehlschlag\n${mit.text}`)
  assert.equal(mit.vorfaelle.length, 1, `${skript}: genau ein Vorfall\n${mit.text}`)
  const v = mit.vorfaelle[0]!
  assert.equal(v.ziel, 'https://worker.test/vorfall')
  assert.equal(v.token, 'tok-900001')
  assert.equal(v.art, art)
  assert.equal(v.plattform, 'prime')
  assert.match(v.text!, /^Lauf abgebrochen: .*Netz aus/)

  const ohne = fahre(skript, false)
  assert.equal(ohne.vorfaelle.length, 0, `${skript}: ohne Token kein Vorfall`)
  assert.equal(ohne.status, 0, `${skript}: ohne Token endet der Lauf ohne Wurf\n${ohne.text}`)
}
rmSync(ordner, { recursive: true, force: true })
console.log(`check-abbruch-folgen-urteile: ok (${faelle.length} Skripte, je Vorfall mit Token, keiner ohne)`)
