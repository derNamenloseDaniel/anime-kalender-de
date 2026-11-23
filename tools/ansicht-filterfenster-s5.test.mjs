import assert from 'node:assert/strict'
import { test } from 'node:test'
import { s5Abweichungen } from './ansicht-filterfenster-s5.mjs'

const gut = {
  datenbank: true,
  grund: 'rgb(255, 255, 255)',
  hintergruende: ['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'],
  streambarDa: true,
  streambarHoehe: 44,
  plattformName: 'Netflix, 14 Titel',
  plattformZahlSichtbar: true,
  schalterImFenster: false,
}

test('Stand nach S5 ist ohne Abweichung', () => assert.deepEqual(s5Abweichungen('db', gut), []))

test('Stand von main (farbige Schnellfläche, „verfügbar", keine Zahlen, Schalter im Fenster) ist rot', () => {
  const alt = { ...gut, hintergruende: ['rgb(224, 242, 254)'], streambarDa: false, plattformZahlSichtbar: false, plattformName: 'Netflix', schalterImFenster: true }
  const a = s5Abweichungen('db', alt)
  assert.equal(a.length, 4)
})

test('Zu kleine Tippfläche und fehlende Zahl im Namen werden gemeldet', () => {
  const a = s5Abweichungen('db', { ...gut, streambarHoehe: 32, plattformName: 'Netflix' })
  assert.equal(a.length, 2)
})

test('Kalender prüft nur die Schnellfläche', () => assert.deepEqual(s5Abweichungen('wo', { ...gut, datenbank: false, plattformZahlSichtbar: false, schalterImFenster: true }), []))
