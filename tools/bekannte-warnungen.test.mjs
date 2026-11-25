// Bekannte Warnungen: gültiger Eintrag nimmt ab, abgelaufener nicht, anderer Text bleibt sichtbar; dazu der echte Eintrag im Repo.
import assert from 'node:assert/strict'
import { abgelaufenZeile, bekanntZeile, ladeBekannte, wendeBekannteAn } from './bekannte-warnungen.mjs'

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

// Der echte Eintrag im Repo trifft den Text, den bestand-bauen.yml erzeugt, und nur ihn.
const echt = ladeBekannte()
assert.equal(wendeBekannteAn(echt, [SPRECHER], jetzt).bekannt.length, 1, 'Repo-Eintrag trifft die sprecher-Warnung')
assert.equal(wendeBekannteAn(echt, [andereArt], jetzt).bekannt.length, 0, 'Repo-Eintrag verschluckt keine weitere Art')
console.log('bekannte-warnungen: ok')
