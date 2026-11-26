// Knopf „Übersicht“ in der Leiste: erzeugt `uebersicht.html` aus stand.md (tools/uebersicht.mjs) und öffnet sie im Standardbrowser.
// `lauf`, `lies` und `toast` kommen als Funktionen herein (kein `$` als Wert); ein zweiter Klick während des Erzeugens tut nichts.
// Start ohne Konsolenfenster: node.exe ist ein Konsolenprogramm und `$.process.run` kennt kein Fensterflag (API-Doku, ProcessRunInit:
// cwd, env, stdin, timeoutMs), also läuft es über wscript.exe (Fensterprogramm, Fensterstil 0) und tools/uebersicht-versteckt.vbs.
export const UEBERSICHT_SKRIPT = 'C:/code/ai/anime-kalender-de/tools/uebersicht.mjs'
export const UEBERSICHT_VERSTECKT = 'C:/code/ai/anime-kalender-de/tools/uebersicht-versteckt.vbs'
export const UEBERSICHT_LOG = 'C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/.uebersicht-log.txt'
export const UEBERSICHT_HTML = 'C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/uebersicht.html'
// Über der Gesamtfrist des Skripts (75 s, GESAMT_FRIST_MS in tools/uebersicht.mjs), damit das Skript selbst sauber endet.
export const UEBERSICHT_FRIST_MS = 90_000

export type Lauf = (argv: string[], optionen?: { timeoutMs: number }) => Promise<{ exitCode: number; stderr: string }>
type Abhaengigkeiten = { lauf: Lauf; lies: (pfad: string) => Promise<string>; toast: (text: string) => void }

let laeuft = false

// Erste Zeile der Fehlerausgabe, höchstens 120 Zeichen, damit der Toast lesbar bleibt.
function ersteZeile(text: string): string {
  return (text.split('\n').find(z => z.trim()) ?? '').slice(0, 120)
}

// Fehlertext aus der Logdatei des Skripts; fehlt sie oder ist sie leer, bleibt der Exit-Code.
async function fehlerText(lies: Abhaengigkeiten['lies'], exitCode: number): Promise<string> {
  const zeile = await lies(UEBERSICHT_LOG).then(ersteZeile, () => '')
  return zeile || `Exit ${exitCode}`
}

export async function erzeugeUndOeffne({ lauf, lies, toast }: Abhaengigkeiten): Promise<void> {
  if (laeuft) return
  laeuft = true
  try {
    const erzeugt = await lauf(['wscript.exe', '//B', '//NoLogo', UEBERSICHT_VERSTECKT, UEBERSICHT_SKRIPT, UEBERSICHT_LOG], { timeoutMs: UEBERSICHT_FRIST_MS })
    if (erzeugt.exitCode !== 0) {
      toast(`Übersicht fehlgeschlagen: ${await fehlerText(lies, erzeugt.exitCode)}`)
      return
    }
    // Der Explorer meldet beim Öffnen auch bei Erfolg oft Exit 1: nur ein Start, der scheitert, zählt als Fehler.
    await lauf(['explorer.exe', UEBERSICHT_HTML])
  } catch (fehler) {
    toast(`Übersicht fehlgeschlagen: ${ersteZeile(String((fehler as Error)?.message ?? fehler))}`)
  } finally {
    laeuft = false
  }
}
