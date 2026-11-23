/**
 * Wächter für `useVerlaufEintrag`: Das Fenster schließt nur bei echtem Zurück, nie durch eine Filteränderung,
 * die die Adresse auf den Wert beim Öffnen zurücksetzt (Datenbank, Chip dreimal: kw → xkw → ohne).
 * Ein Verlaufsspeicher wie im Browser: Hash-Wechsel legt einen Eintrag an und feuert popstate (Chrome/Firefox).
 */
import assert from 'node:assert/strict'
import { oeffneVerlaufEintrag, type VerlaufUmgebung } from '../web/src/lib/use-verlauf-eintrag.ts'

function browser(start: string) {
  const eintraege: { state: any; url: string }[] = [{ state: null, url: start }]
  let i = 0
  let hoerer: (() => void) | undefined
  const feuer = () => hoerer?.()
  const umg: VerlaufUmgebung = {
    history: {
      get state() { return eintraege[i].state },
      pushState(state: any, _t: string, url?: string | URL | null) {
        eintraege.splice(i + 1)
        eintraege.push({ state, url: url ? String(url) : eintraege[i].url })
        i++
      },
      replaceState(state: any) { eintraege[i].state = state },
      back() { if (i > 0) { i--; queueMicrotask(feuer) } },
    } as VerlaufUmgebung['history'],
    location: { get href() { return eintraege[i].url } },
    addEventListener: (_a, f) => { hoerer = f },
    removeEventListener: () => { hoerer = undefined },
  }
  /** Wie `location.hash = …`: neuer Eintrag ohne State, popstate folgt. */
  const hash = (h: string) => {
    eintraege.splice(i + 1)
    eintraege.push({ state: null, url: h })
    i++
    feuer()
  }
  /** Geräte-Zurück: Eintrag davor, popstate folgt. */
  const zurueck = async () => { umg.history.back(); await Promise.resolve() }
  return { umg, hash, zurueck }
}

const ADRESSE = 'https://x.de/#/datenbank'

async function main() {
  // Dreifachklick auf einen Chip: Adresse landet wieder bei der Ausgangsadresse — das Fenster bleibt offen.
  const b = browser(ADRESSE)
  let zu = 0
  const ende = oeffneVerlaufEintrag(() => zu++, b.umg)
  b.hash('https://x.de/#/datenbank?kw=Cartoon')
  b.hash('https://x.de/#/datenbank?xkw=Cartoon')
  b.hash(ADRESSE)
  assert.equal(zu, 0, 'Filteränderung darf das Fenster nicht schließen (dritter Klick)')

  // Echtes Zurück: bis zum Eintrag vor dem Fenster zurück schließt es genau einmal.
  for (let k = 0; k < 3; k++) await b.zurueck()
  assert.equal(zu, 0, 'Zurück durch die Filter-Einträge schließt noch nicht')
  await b.zurueck()
  assert.equal(zu, 1, 'Zurück auf den Eintrag vor dem Fenster schließt es')
  ende()

  // Ohne Filteränderung: ein Zurück schließt.
  const c = browser(ADRESSE)
  let zu2 = 0
  oeffneVerlaufEintrag(() => zu2++, c.umg)
  await c.zurueck()
  assert.equal(zu2, 1, 'Zurück schließt das Fenster')
  console.log('check-verlauf-eintrag: ok')
}

main().catch((e) => { console.error(e); process.exit(1) })
