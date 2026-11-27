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

import { chipAbweichungen } from './ansicht-filterfenster-s5.mjs'

const chips = { da: true, anzahl: 8, namen: ['Netflix entfernen', 'Disc ausgeschlossen, entfernen', 'Alle zurücksetzen'], flaeche: [44, 44, 44], seitenUeberbreite: 0, reihen: 1, scrollbar: true, mobil: true }

test('Chipzeile im Soll ist ohne Abweichung', () => assert.deepEqual(chipAbweichungen('db', chips), []))
test('Fehlende Zeile, kleine Fläche, Überbreite, Handy mit zwei Reihen, Name ohne Zustand werden gemeldet', () => {
  assert.equal(chipAbweichungen('db', { da: false }).length, 1)
  assert.equal(chipAbweichungen('db', { ...chips, flaeche: [32, 44, 44] }).length, 1)
  assert.equal(chipAbweichungen('db', { ...chips, seitenUeberbreite: 120 }).length, 1)
  assert.equal(chipAbweichungen('db', { ...chips, reihen: 2 }).length, 1)
  assert.equal(chipAbweichungen('db', { ...chips, namen: ['Netflix entfernen', 'Disc entfernen'] }).length, 1)
})
