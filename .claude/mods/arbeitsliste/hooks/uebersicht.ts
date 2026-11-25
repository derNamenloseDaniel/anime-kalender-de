// Knopf „Übersicht“ in der Leiste: erzeugt `uebersicht.html` aus stand.md (tools/uebersicht.mjs) und öffnet sie im Standardbrowser.
// `lauf` und `toast` kommen als Funktionen herein (kein `$` als Wert); ein zweiter Klick während des Erzeugens tut nichts.
export const UEBERSICHT_SKRIPT = 'C:/code/ai/anime-kalender-de/tools/uebersicht.mjs'
export const UEBERSICHT_HTML = 'C:/code/ai/anime-kalender-de/daniel-zum-abarbeiten/uebersicht.html'
export const UEBERSICHT_FRIST_MS = 90_000

export type Lauf = (argv: string[], optionen?: { timeoutMs: number }) => Promise<{ exitCode: number; stderr: string }>
type Abhaengigkeiten = { lauf: Lauf; toast: (text: string) => void }

let laeuft = false

// Erste Zeile der Fehlerausgabe, höchstens 120 Zeichen, damit der Toast lesbar bleibt.
function ersteZeile(text: string): string {
  return (text.split('\n').find(z => z.trim()) ?? '').slice(0, 120)
}

export async function erzeugeUndOeffne({ lauf, toast }: Abhaengigkeiten): Promise<void> {
  if (laeuft) return
  laeuft = true
  try {
    const erzeugt = await lauf(['node', UEBERSICHT_SKRIPT], { timeoutMs: UEBERSICHT_FRIST_MS })
    if (erzeugt.exitCode !== 0) {
      toast(`Übersicht fehlgeschlagen: ${ersteZeile(erzeugt.stderr) || `Exit ${erzeugt.exitCode}`}`)
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
