import { test, expect } from 'claude-code/testing'

import { BAND, starte } from './testhilfe'
import { UEBERSICHT_FRIST_MS, UEBERSICHT_HTML, UEBERSICHT_SKRIPT, erzeugeUndOeffne } from './uebersicht'

function attrappe(ergebnisse: Array<{ exitCode: number; stderr: string } | Error>) {
  const aufrufe: Array<{ argv: string[]; frist?: number }> = []
  const toasts: string[] = []
  const lauf = async (argv: string[], o?: { timeoutMs: number }) => {
    aufrufe.push({ argv, frist: o?.timeoutMs })
    const r = ergebnisse[aufrufe.length - 1] ?? { exitCode: 0, stderr: '' }
    if (r instanceof Error) throw r
    return r
  }
  return { aufrufe, toasts, deps: { lauf, toast: (t: string) => void toasts.push(t) } }
}

test('Übersicht: erst erzeugen mit Frist, dann im Standardbrowser öffnen', async () => {
  const a = attrappe([{ exitCode: 0, stderr: '' }, { exitCode: 1, stderr: '' }])
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.map(x => x.argv)).toEqual([['node', UEBERSICHT_SKRIPT], ['explorer.exe', UEBERSICHT_HTML]])
  expect(a.aufrufe[0].frist).toBe(UEBERSICHT_FRIST_MS)
  expect(a.toasts).toEqual([])
})

test('Übersicht: scheitert das Erzeugen, öffnet nichts und der Toast nennt die erste Fehlerzeile', async () => {
  const a = attrappe([{ exitCode: 1, stderr: '\nstand.md fehlt: X\nzweite Zeile' }])
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.length).toBe(1)
  expect(a.toasts).toEqual(['Übersicht fehlgeschlagen: stand.md fehlt: X'])
})

test('Übersicht: Exit ohne Text und nicht startbarer Befehl melden sich ebenfalls', async () => {
  const leer = attrappe([{ exitCode: 3, stderr: '' }])
  await erzeugeUndOeffne(leer.deps)
  expect(leer.toasts).toEqual(['Übersicht fehlgeschlagen: Exit 3'])
  const kaputt = attrappe([new Error('node nicht gefunden')])
  await erzeugeUndOeffne(kaputt.deps)
  expect(kaputt.toasts).toEqual(['Übersicht fehlgeschlagen: node nicht gefunden'])
  const browser = attrappe([{ exitCode: 0, stderr: '' }, new Error('explorer weg')])
  await erzeugeUndOeffne(browser.deps)
  expect(browser.toasts).toEqual(['Übersicht fehlgeschlagen: explorer weg'])
})

test('Übersicht: Doppelklick startet nur einen Lauf, danach geht es wieder', async () => {
  const a = attrappe([])
  const beide = [erzeugeUndOeffne(a.deps), erzeugeUndOeffne(a.deps)]
  await Promise.all(beide)
  expect(a.aufrufe.filter(x => x.argv[0] === 'node').length).toBe(1)
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.filter(x => x.argv[0] === 'node').length).toBe(2)
})

test('Leiste: Knopf „Übersicht“ startet das Erzeugen und danach den Browser über den echten Host-Aufruf', async ($, on) => {
  starte(on, null, [], true)
  const gestartet: string[][] = []
  const fristen: Array<number | undefined> = []
  on('process.run', (_$, e) => {
    const ev = e as { argv: string[]; init?: { timeoutMs?: number } }
    gestartet.push([...ev.argv])
    fristen.push(ev.init?.timeoutMs)
    return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
  })
  await $.session.start({ cwd: 'C:/x', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await band.press({ key: 'uebersicht-oeffnen' })
  await new Promise(r => setTimeout(r, 50))
  expect(gestartet).toEqual([['node', UEBERSICHT_SKRIPT], ['explorer.exe', UEBERSICHT_HTML]])
  expect(fristen[0]).toBe(UEBERSICHT_FRIST_MS)
  await band.unmount()
})

test('Leiste: scheitert das Erzeugen, zeigt der Knopf den Fehler als Toast und öffnet nichts', async ($, on) => {
  starte(on, null, [], true)
  const gestartet: string[][] = []
  const hinweise: string[] = []
  on('ui.toast', (_$, e) => { hinweise.push(String((e as { text?: string }).text)); return { value: undefined } as never })
  on('process.run', (_$, e) => { gestartet.push([...(e as { argv: string[] }).argv]); return { value: { exitCode: 1, stdout: '', stderr: 'stand.md fehlt: X' } } as never })
  await $.session.start({ cwd: 'C:/x', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await band.press({ key: 'uebersicht-oeffnen' })
  await new Promise(r => setTimeout(r, 50))
  expect(gestartet).toEqual([['node', UEBERSICHT_SKRIPT]])
  expect(hinweise).toEqual(['Übersicht fehlgeschlagen: stand.md fehlt: X'])
  await band.unmount()
})

test('Übersicht: der Toast kürzt die Fehlerzeile auf 120 Zeichen', async () => {
  const a = attrappe([{ exitCode: 1, stderr: 'x'.repeat(300) }])
  await erzeugeUndOeffne(a.deps)
  expect(a.toasts).toEqual([`Übersicht fehlgeschlagen: ${'x'.repeat(120)}`])
})
