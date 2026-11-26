/**
 * Zusicherung: `buildIcs` erzeugt auch bei schwierigen Titeln RFC-5545-gültige Dateien (26.11.2026; Nachnutzer importieren den
 * Kalender). Gegenfälle: Komma, Semikolon, Backslash, Zeilenumbruch, einzelnes CR, Steuerzeichen, Vier-Oktett-Zeichen an der
 * Faltstelle. Die Prüfung selbst: Positivprobe (gültige Datei) und je Regel eine absichtlich kaputte Datei.
 * Aufruf: `npm run check:logic`.
 */
import type { ReleaseEvent } from '../shared/types.ts'
import { buildIcs } from '../shared/ics.ts'
import { ICS_REGELN, pruefeIcs } from '../shared/ics-pruefung.ts'

let verletzt = 0
function pruefe(name: string, ok: boolean, gefunden?: unknown): void {
  if (ok) return void console.log(`  ✓ ${name}`)
  verletzt++
  console.error(`  ✖ ${name}${gefunden === undefined ? '' : ` — gefunden: ${JSON.stringify(gefunden)}`}`)
}

const ev = (name: string, i = 1, o: Partial<ReleaseEvent> = {}): ReleaseEvent =>
  ({ id: `t${i}@2026-10-18#1`, releaseSlug: 't', titleId: i, name, date: '2026-10-18', time: '17:00', releaseType: 'weekly', platform: 'crunchyroll', episode: 1, episodeCount: 12, ...o }) as ReleaseEvent

const schlimme = ['A, B; C\\D', 'Zeile\neins\r\nzwei', 'nur\rCR', 'Steuer\u0000zeichen\u0007x\u001f', '𝟘'.repeat(40), `${'あ'.repeat(24)}😀${'😀'.repeat(3)}`, 'Ende\\', 'Ende\\\\;']

function guteDatei(): void {
  console.log('\nbuildIcs mit schwierigen Titeln:')
  const text = buildIcs(schlimme.map((n, i) => ev(n, i + 1)), { siteUrl: 'https://anime-kalender.de/', erinnerung: true, calendarName: 'Name, mit; Sonderzeichen\\' })
  const z = pruefeIcs(text)
  for (const r of ICS_REGELN) pruefe(`${r}: 0`, z[r] === 0, z[r])
  const entfaltet = text.replace(/\r\n /g, '')
  pruefe('Komma und Semikolon maskiert, Inhalt erhalten', entfaltet.includes('SUMMARY:A\\, B\\; C\\\\D – Folge 1/12'))
  pruefe('Zeilenumbruch und einzelnes CR werden \\n', entfaltet.includes('SUMMARY:Zeile\\neins\\nzwei – Folge 1/12') && entfaltet.includes('SUMMARY:nur\\nCR – Folge 1/12'))
  pruefe('Vier-Oktett-Zeichen bleiben beim Falten ganz', entfaltet.includes('😀😀😀😀'))
}

function schlechteDateien(): void {
  console.log('\nDie Prüfung erkennt jede Regel:')
  const ok = buildIcs([ev('X')])
  const kaputt: [string, string, string][] = [
    ['zeilenende-nicht-crlf', ok.replace('BEGIN:VEVENT\r\n', 'BEGIN:VEVENT\n'), 'LF'],
    ['zeile-ueber-75-oktette', ok.replace('SUMMARY:', `SUMMARY:${'x'.repeat(90)}`), 'lang'],
    ['falz-ohne-vorgaenger', ' Falz\r\n' + ok, 'Falz am Anfang'],
    ['utf8-zerrissen', ok.replace('SUMMARY:X', 'SUMMARY:�'), 'Ersatzzeichen'],
    ['text-unmaskiert', ok.replace('SUMMARY:X', 'SUMMARY:a,b'), 'Komma'],
    ['text-unmaskiert', ok.replace('SUMMARY:X', 'SUMMARY:a\\qb'), 'Backslash'],
    ['text-steuerzeichen', ok.replace('SUMMARY:X', 'SUMMARY:a\u0001b'), 'Steuerzeichen'],
    ['vevent-ohne-uid', ok.replace(/UID:[^\r]*\r\n/, ''), 'UID'],
    ['vevent-ohne-dtstamp', ok.replace(/DTSTAMP:[^\r]*\r\n/, ''), 'DTSTAMP'],
    ['uid-doppelt', ok.replace('END:VCALENDAR', ok.slice(ok.indexOf('BEGIN:VEVENT'), ok.indexOf('END:VCALENDAR')) + 'END:VCALENDAR'), 'UID doppelt'],
    ['vevent-ohne-summary', ok.replace(/SUMMARY:[^\r]*\r\n/, ''), 'SUMMARY'],
    ['vevent-ohne-dtstart', ok.replace(/DTSTART:[^\r]*\r\n/, ''), 'DTSTART'],
    ['url-keine-adresse', ok.replace('END:VEVENT', 'URL:kein-link\r\nEND:VEVENT'), 'URL'],
    ['klammern-unausgeglichen', ok.replace('END:VEVENT\r\n', ''), 'END fehlt'],
    ['kopf-fehlt', ok.replace('VERSION:2.0\r\n', ''), 'VERSION'],
  ]
  for (const [regel, text, was] of kaputt) pruefe(`${regel} (${was})`, pruefeIcs(text)[regel as (typeof ICS_REGELN)[number]] > 0)
  pruefe('Positivprobe: gültige Datei ohne Befund', ICS_REGELN.every((r) => pruefeIcs(ok)[r] === 0), pruefeIcs(ok))
}

guteDatei()
schlechteDateien()
console.log(verletzt ? `\n${verletzt} Zusicherung(en) verletzt.` : '\nICS RFC 5545: alle Zusicherungen halten.')
process.exit(verletzt ? 1 : 0)
