import { test, expect } from 'claude-code/testing'

import { BAND, dateiWelt, starte } from './testhilfe'
import { UEBERSICHT_FRIST_MS, UEBERSICHT_HTML, UEBERSICHT_LOG, UEBERSICHT_SKRIPT, UEBERSICHT_VERSTECKT, erzeugeUndOeffne } from './uebersicht'

const START = ['wscript.exe', '//B', '//NoLogo', UEBERSICHT_VERSTECKT, UEBERSICHT_SKRIPT, UEBERSICHT_LOG]

function attrappe(ergebnisse: Array<{ exitCode: number; stderr: string } | Error>, log: string | Error = new Error('keine Logdatei')) {
  const aufrufe: Array<{ argv: string[]; frist?: number }> = []
  const toasts: string[] = []
  const gelesen: string[] = []
  const lauf = async (argv: string[], o?: { timeoutMs: number }) => {
    aufrufe.push({ argv, frist: o?.timeoutMs })
    const r = ergebnisse[aufrufe.length - 1] ?? { exitCode: 0, stderr: '' }
    if (r instanceof Error) throw r
    return r
  }
  const lies = async (pfad: string) => {
    gelesen.push(pfad)
    if (log instanceof Error) throw log
    return log
  }
  return { aufrufe, toasts, gelesen, deps: { lauf, lies, toast: (t: string) => void toasts.push(t) } }
}

test('Übersicht: erst versteckt erzeugen (kein Konsolenfenster) mit Frist, dann im Standardbrowser öffnen', async () => {
  const a = attrappe([{ exitCode: 0, stderr: '' }, { exitCode: 1, stderr: '' }])
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.map(x => x.argv)).toEqual([START, ['explorer.exe', UEBERSICHT_HTML]])
  expect(a.aufrufe[0].argv[0]).not.toBe('node')
  expect(a.aufrufe[0].frist).toBe(UEBERSICHT_FRIST_MS)
  expect(a.toasts).toEqual([])
  expect(a.gelesen).toEqual([])
})

test('Übersicht: scheitert das Erzeugen, öffnet nichts und der Toast nennt die erste Zeile der Logdatei', async () => {
  const a = attrappe([{ exitCode: 1, stderr: '' }], '\nstand.md fehlt: X\nzweite Zeile')
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.length).toBe(1)
  expect(a.gelesen).toEqual([UEBERSICHT_LOG])
  expect(a.toasts).toEqual(['Übersicht fehlgeschlagen: stand.md fehlt: X'])
})

test('Übersicht: ohne lesbare oder mit leerer Logdatei bleibt der Exit-Code, ein nicht startbarer Befehl meldet seinen Grund', async () => {
  const leer = attrappe([{ exitCode: 3, stderr: '' }])
  await erzeugeUndOeffne(leer.deps)
  expect(leer.toasts).toEqual(['Übersicht fehlgeschlagen: Exit 3'])
  const leeresLog = attrappe([{ exitCode: 4, stderr: '' }], '  \n')
  await erzeugeUndOeffne(leeresLog.deps)
  expect(leeresLog.toasts).toEqual(['Übersicht fehlgeschlagen: Exit 4'])
  const kaputt = attrappe([new Error('wscript nicht gefunden')])
  await erzeugeUndOeffne(kaputt.deps)
  expect(kaputt.toasts).toEqual(['Übersicht fehlgeschlagen: wscript nicht gefunden'])
  const browser = attrappe([{ exitCode: 0, stderr: '' }, new Error('explorer weg')])
  await erzeugeUndOeffne(browser.deps)
  expect(browser.toasts).toEqual(['Übersicht fehlgeschlagen: explorer weg'])
})

test('Übersicht: Doppelklick startet nur einen Lauf, danach geht es wieder', async () => {
  const a = attrappe([])
  const beide = [erzeugeUndOeffne(a.deps), erzeugeUndOeffne(a.deps)]
  await Promise.all(beide)
  expect(a.aufrufe.filter(x => x.argv[0] === 'wscript.exe').length).toBe(1)
  await erzeugeUndOeffne(a.deps)
  expect(a.aufrufe.filter(x => x.argv[0] === 'wscript.exe').length).toBe(2)
})

test('Übersicht: der Toast kürzt die Fehlerzeile auf 120 Zeichen', async () => {
  const a = attrappe([{ exitCode: 1, stderr: '' }], 'x'.repeat(300))
  await erzeugeUndOeffne(a.deps)
  expect(a.toasts).toEqual([`Übersicht fehlgeschlagen: ${'x'.repeat(120)}`])
})

test('Leiste: Knopf „Übersicht“ startet das Erzeugen versteckt und danach den Browser über den echten Host-Aufruf', async ($, on) => {
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
  expect(gestartet).toEqual([START, ['explorer.exe', UEBERSICHT_HTML]])
  expect(fristen[0]).toBe(UEBERSICHT_FRIST_MS)
  await band.unmount()
})

test('Leiste: scheitert das Erzeugen, zeigt der Knopf den Fehler als Toast und öffnet nichts', async ($, on) => {
  starte(on, null, [], true)
  const gestartet: string[][] = []
  const hinweise: string[] = []
  on('ui.toast', (_$, e) => { hinweise.push(String((e as { text?: string }).text)); return { value: undefined } as never })
  dateiWelt['.uebersicht-log.txt'] = 'stand.md fehlt: Y\nzweite'
  on('process.run', (_$, e) => { gestartet.push([...(e as { argv: string[] }).argv]); return { value: { exitCode: 1, stdout: '', stderr: '' } } as never })
  await $.session.start({ cwd: 'C:/x', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await band.press({ key: 'uebersicht-oeffnen' })
  await new Promise(r => setTimeout(r, 50))
  expect(gestartet).toEqual([START])
  expect(hinweise).toEqual(['Übersicht fehlgeschlagen: stand.md fehlt: Y'])
  await band.unmount()
})
