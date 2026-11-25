// Bekannte Warnungen: gültiger Eintrag nimmt ab, abgelaufener nicht, anderer Text bleibt sichtbar; dazu der echte Eintrag im Repo.
import assert from 'node:assert/strict'
import { abgelaufenZeile, bekanntZeile, ladeBekannte, nimmBekannteAb, wendeBekannteAn } from './bekannte-warnungen.mjs'

const EINTRAG = { workflow: 'Bestandsbau', muster: 'Mängel Stillstand:.*— gestiegen: sprecher$', bis: '2026-11-30', notiz: 'sprecher bekannt, Besitzer Wochenlauf 30.11.' }
const SPRECHER = { workflow: 'Bestandsbau', notiz: 'Mängel Stillstand: seit 2026-11-22: 1 gestiegen (Arten: Logzeile MAENGEL_STILLSTAND_ARTEN) — gestiegen: sprecher' }
const am = (iso) => Date.parse(iso)

const vorBis = wendeBekannteAn([EINTRAG], [SPRECHER], am('2026-11-30T23:00:00Z'))
assert.equal(vorBis.bekannt.length, 1, 'vor bis (auch am Tag selbst): abgenommen')
assert.equal(vorBis.abgelaufen.length, 0)
assert.equal(bekanntZeile(EINTRAG), 'bekannt bis 2026-11-30: sprecher bekannt, Besitzer Wochenlauf 30.11. (Bestandsbau)')

const nachBis = wendeBekannteAn([EINTRAG], [SPRECHER], am('2026-12-01T00:00:00Z'))
assert.equal(nachBis.bekannt.length, 0, 'nach bis: Warnung bleibt sichtbar')
assert.deepEqual(nachBis.abgelaufen, [EINTRAG], 'nach bis: Eintrag als abgelaufen gemeldet')
assert.match(abgelaufenZeile(EINTRAG), /^abgelaufen: Bestandsbau .*entfernen oder verlängern$/)

const jetzt = am('2026-11-26T00:00:00Z')
const andereArt = { ...SPRECHER, notiz: SPRECHER.notiz.replace('sprecher', 'sprecher; fsk') }
const andereZahl = { ...SPRECHER, notiz: SPRECHER.notiz + ' | ohne Abbau: fsk' }
const anderer = { workflow: 'Bestandsbau', notiz: 'Crunchyroll-Folgen ohne Termin (2): Last Boss #1' }
const fremd = { ...SPRECHER, workflow: 'Deploy' }
const gemischt = wendeBekannteAn([EINTRAG], [andereArt, andereZahl, anderer, fremd, SPRECHER], jetzt)
assert.deepEqual(gemischt.bekannt.map((b) => b.warnung), [SPRECHER], 'nur der passende Text, nie ein Freibrief je Workflow')

// Segmente: der Stillstand-Satz steht immer hinten, davor stehen fremde Warnungen (` · `, bestand-bauen.yml). Ein fremdes Segment, davor oder danach, hält die ganze Warnung sichtbar.
const davor = { workflow: 'Bestandsbau', notiz: `Datenqualität hart rot: Klammer · ${SPRECHER.notiz}` }
const davorCr = { workflow: 'Bestandsbau', notiz: `Crunchyroll-Folgen ohne Termin (2): Last Boss #1 · ${SPRECHER.notiz}` }
const danach = { workflow: 'Bestandsbau', notiz: `${SPRECHER.notiz} · Neue Meldungen zurückgestellt: x` }
const segmente = wendeBekannteAn([EINTRAG], [davor, davorCr, danach, SPRECHER], jetzt)
assert.deepEqual(segmente.bekannt.map((b) => b.warnung), [SPRECHER], 'nur der reine Stillstand-Satz wird abgenommen')
assert.deepEqual(segmente.unbekannt.map((u) => u.rest), [['Datenqualität hart rot: Klammer'], ['Crunchyroll-Folgen ohne Termin (2): Last Boss #1'], ['Neue Meldungen zurückgestellt: x']], 'unbekannter Rest wird genannt, das bekannte Segment nicht')
const vorangestellt = { workflow: 'Bestandsbau', notiz: `Fremdtext ${SPRECHER.notiz}` }
assert.equal(wendeBekannteAn([EINTRAG], [vorangestellt], jetzt).bekannt.length, 0, 'Muster gilt ganz: Text vor dem Satz im selben Segment bleibt sichtbar')
const zweiter ={ ...EINTRAG, muster: 'Datenqualität hart rot: Klammer', notiz: 'Klammer bekannt' }
assert.equal(wendeBekannteAn([EINTRAG, zweiter], [davor], jetzt).bekannt.length, 1, 'jedes Segment bekannt: abgenommen')

// Verdrahtung: nimmBekannteAb sendet genau einmal, nur bei vollständig bekannter Warnung mit lauf_id, Token und ohne --trocken.
const lauf = (w, ...id) => ({ workflow: 'Bestandsbau', notiz: w.notiz, laufId: id.length ? id[0] : 'L1', r: { art: 'Bestandsbau', zustand: 'warnung', am: 'x', stunden: 1 } })
const fahre = async (warnungen, opt = {}) => {
  const gesendet = []
  const zeilen = []
  await nimmBekannteAb({
    eintraege: [EINTRAG], warnungen, jetztMs: jetzt, trocken: false, token: 'T', log: (z) => zeilen.push(z),
    senden: async (id, notiz) => gesendet.push([id, notiz]), zeigeWarnung: (w, rest) => `WARNUNG ${w.laufId}: ${rest}`, ...opt,
  })
  return { gesendet, zeilen }
}
const ok = await fahre([lauf(SPRECHER)])
assert.deepEqual(ok.gesendet, [['L1', 'bekannt bis 2026-11-30: sprecher bekannt, Besitzer Wochenlauf 30.11.']], 'passende Warnung: genau ein POST')
const trocken = await fahre([lauf(SPRECHER)], { trocken: true })
assert.equal(trocken.gesendet.length, 0, '--trocken: kein POST')
assert.match(trocken.zeilen[0], /\(trocken, nicht abgenommen\)$/)
assert.equal((await fahre([lauf(SPRECHER)], { token: '' })).gesendet.length, 0, 'ohne Token: kein POST')
const fremdLauf = await fahre([lauf(davor)])
assert.equal(fremdLauf.gesendet.length, 0, 'fremde Warnung: kein POST')
assert.deepEqual(fremdLauf.zeilen, ['WARNUNG L1: Datenqualität hart rot: Klammer'], 'fremde Warnung bleibt sichtbar, mit unbekanntem Rest')
for (const fehlt of [undefined, null]) {
  const ohneId = await fahre([lauf(SPRECHER, fehlt)])
  assert.equal(ohneId.gesendet.length, 0, 'ohne lauf_id: kein POST (nie mit undefined)')
  assert.match(ohneId.zeilen[0], /\(ohne lauf_id, nicht abgenommen\)$/)
}
const alt = await fahre([], { jetztMs: am('2026-12-01T00:00:00Z') })
assert.deepEqual(alt.zeilen, [abgelaufenZeile(EINTRAG)], 'abgelaufener Eintrag: gemeldet auch ohne Warnung')

// Der echte Eintrag im Repo trifft den Text, den bestand-bauen.yml erzeugt, und nur ihn.
const echt = ladeBekannte()
assert.equal(wendeBekannteAn(echt, [SPRECHER], jetzt).bekannt.length, 1, 'Repo-Eintrag trifft die sprecher-Warnung')
assert.equal(wendeBekannteAn(echt, [andereArt], jetzt).bekannt.length, 0, 'Repo-Eintrag verschluckt keine weitere Art')
console.log('bekannte-warnungen: ok')
