#!/usr/bin/env node
/**
 * Prüft, dass die Bühnen-Seite das Fenster füllt, ohne selbst zu scrollen (Navigator-iframe, 785 px hoch), gegen `buehne-dist/`:
 *
 * - 1728×785, Gerät 375: html und body haben keinen Überlauf (`scrollHeight − clientHeight` = 0), und die Zellen reichen bis zum
 *   unteren Rand (Seite füllt das Fenster, `.seite` = 100dvh). Bei 1280 brechen die Zellen seit der Untergrenze 610 px in zwei
 *   Reihen um, die Seite scrollt dort bewusst (Daniel, 24.11.2026: Zelle mindestens Handyhöhe).
 * - 1280×500, Gerät 375: keine Zelle unter 610 px (Untergrenze, mindestens Handyhöhe); die Seite scrollt dort bewusst.
 * - Im hohen Werkzeug-Fenster (`starteBuehne`, 12000 px): jede Zelle hat ihre volle Gerätehöhe (375 → 812, Desktop 1200 → 800), die
 *   Zelle samt Beschriftung ist 834,8 px hoch wie vor dem Umbau (Bildhöhen der `buehne:bilder`), und „beide" ist dort nicht verkleinert.
 *
 * Aufruf: node tools/buehne-fenster-pruefen.mjs        (nach `npm run buehne:bauen`; Exit 1 bei einem Fehler)
 */
import assert from 'node:assert/strict'
import { starteBuehne } from './buehne-seite.mjs'

const ADRESSE = 'http://buehne.test/buehne.html#relative-uhrzeit?v=A&fall=alle&thema=beide&teil=beide&geraet='

/** Überlauf der Seite, sichtbare Höhe der Rahmen und Zellen und tiefste Unterkante einer Zelle. */
async function messe(seite, geraet, breite, hoehe) {
  if (breite) await seite.setViewportSize({ width: breite, height: hoehe })
  await seite.goto('about:blank')
  await seite.goto(`${ADRESSE}${geraet}`, { waitUntil: 'load' })
  await seite.locator('iframe[data-zelle]').first().waitFor()
  return seite.evaluate(() => {
    const ueberlauf = (e) => e.scrollHeight - e.clientHeight
    const zellen = [...document.querySelectorAll('figure.zelle')]
    return {
      html: ueberlauf(document.documentElement),
      body: ueberlauf(document.body),
      rahmen: zellen.map((z) => z.querySelector('iframe').getBoundingClientRect().height.toFixed(1)),
      desktop: zellen.filter((z) => !z.querySelector('iframe').dataset.zelle.includes('-375-')).map((z) => z.querySelector('iframe').getBoundingClientRect().height),
      figuren: zellen.map((z) => z.getBoundingClientRect().height.toFixed(1)),
      oberkanten: zellen.map((z) => z.getBoundingClientRect().top),
      unterkante: Math.max(...zellen.map((z) => z.getBoundingClientRect().bottom)),
    }
  })
}

async function pruefeFensterFuellt(seite) {
  for (const geraet of ['375']) {
    for (const breite of [1728]) {
      const m = await messe(seite, geraet, breite, 785)
      const wo = `Gerät ${geraet}, ${breite}×785`
      assert.equal(m.html, 0, `${wo}: html scrollt (${m.html} px)`)
      assert.equal(m.body, 0, `${wo}: body scrollt (${m.body} px)`)
      assert.ok(m.unterkante >= 785 - 16 - 2, `${wo}: Zellen enden bei ${m.unterkante} px, das Fenster bleibt unten leer`)
    }
  }
}

/** Desktop-Rahmen nie unter Gerätehöhe (Daniel, 22.11.2026): bei „beide" gezeichnet mit Zoom ½, also mindestens 400 px; die Seite scrollt dafür. */
async function pruefeDesktopMindesthoehe(seite) {
  for (const [breite, hoehe] of [[1280, 785], [1600, 900], [1728, 785]]) {
    const m = await messe(seite, 'beide', breite, hoehe)
    const kleinste = Math.min(...m.desktop)
    assert.ok(m.desktop.length > 0 && kleinste >= 399, `beide, ${breite}×${hoehe}: Desktop-Rahmen nur ${kleinste} px hoch (Mindestens Gerätehöhe × ½ = 400)`)
  }
}

async function pruefeUntergrenze(seite) {
  const m = await messe(seite, '375', 1280, 500)
  const kleinste = Math.min(...m.rahmen.map(Number))
  assert.ok(kleinste >= 610, `1280×500: eine Zelle ist nur ${kleinste} px hoch (Untergrenze 610)`)
}

/** Ein mittelhohes Fenster (1728×1300, eine Zeile Handy-Zellen) gibt mehr Platz als die Gerätehöhe: Die Zelle bleibt bei 812 + Beschriftung. */
async function pruefeObergrenze(seite) {
  const m = await messe(seite, '375', 1728, 1300)
  assert.deepEqual(m.rahmen, ['812.0', '812.0', '812.0', '812.0'], '1728×1300: Rahmen höher oder niedriger als die Gerätehöhe 812 px')
  assert.deepEqual(m.figuren, ['834.8', '834.8', '834.8', '834.8'], '1728×1300: Zelle samt Beschriftung nicht 834,8 px')
}

/** Läuft vor jedem `setViewportSize`: Es misst das Fenster, das `starteBuehne` den anderen Werkzeugen gibt. */
async function pruefeVolleHoehe(seite) {
  const handy = await messe(seite, '375')
  assert.deepEqual(handy.rahmen, ['812.0', '812.0', '812.0', '812.0'], 'hohes Fenster, Handy: jede Zelle voll 812 px hoch')
  assert.deepEqual(handy.figuren, ['834.8', '834.8', '834.8', '834.8'], 'hohes Fenster, Handy: Zelle samt Beschriftung 834,8 px wie vor dem Umbau')
  const [oben, , , vierte] = handy.oberkanten
  assert.ok(Math.abs(vierte - oben - 854.8) < 0.05, `hohes Fenster: zweite Zeile ${vierte - oben} px unter der ersten (erwartet 854,8 = Zelle + 20 Abstand)`)
  const beide = await messe(seite, 'beide')
  assert.deepEqual(beide.rahmen, ['812.0', '812.0', '812.0', '812.0', '800.0', '800.0', '800.0', '800.0'], 'hohes Fenster, beide: Handy 812, Desktop 800 px, nicht verkleinert')
}

async function main() {
  const { browser, seite, fremde } = await starteBuehne()
  try {
    await pruefeVolleHoehe(seite)
    await pruefeFensterFuellt(seite)
    await pruefeUntergrenze(seite)
    await pruefeDesktopMindesthoehe(seite)
    await pruefeObergrenze(seite)
  } finally {
    await browser.close()
  }
  assert.equal(fremde.length, 0, `Anfragen nach draußen: ${fremde[0]}`)
  console.log('buehne-fenster-pruefen: ok (Handy-Fenster ohne Überlauf, Desktop-Mindesthöhe, Unter- und Obergrenze, volle Gerätehöhe im hohen Fenster)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
