/**
 * Beispieldaten für das Mockup „Staffel-Reiter“ (F157): 25 ausgedachte Staffeln einer langen Serie, nur um die Leiste
 * mit vielen Reitern zu zeigen. Nichts davon ist belegt; die Namen, Folgenzahlen und Anbieter sind erfunden (Stand 23.11.2026).
 */
export type StaffelStatus = 'erschienen' | 'laeuft' | 'angekuendigt'

export interface Staffel {
  nr: number
  name: string
  folgen: number
  /** Durchlaufende Folgennummer der ersten Folge. */
  von: number
  status: StaffelStatus
  jahr: number
  anbieter: string[]
  /** Deutsche Disc-Ausgabe vorhanden (nur erschienene Staffeln). */
  disc: boolean
  handlung: string
}

/** Die laufende Staffel: beim Öffnen gewählt und in der Leiste sichtbar gescrollt. */
export const LAUFENDE_NR = 22

const ROH: [string, number, string][] = [
  ['Der Aufbruch', 26, 'Ein Dorfjunge verlässt sein Zuhause und findet auf der ersten Reise seine ersten Gefährten.'],
  ['Die Küstenstadt', 26, 'Im Hafen wartet ein Rätsel um verschwundene Schiffe, und die Gruppe gerät zwischen zwei Familien.'],
  ['Das Turnier', 24, 'Ein Wettkampf der besten Teams des Landes beginnt, doch ein Verdacht überschattet die Vorrunden.'],
  ['Schatten im Gebirge', 26, 'Ein Pass durch die Berge ist gesperrt, und die Suche nach dem Grund führt in alte Minen.'],
  ['Die Insel der Stille', 20, 'Auf einer Insel ohne Geräusche stößt die Gruppe auf eine Bewohnerin, die ihr Geheimnis hütet.'],
  ['Wiedersehen am Fluss', 26, 'Ein alter Freund taucht auf und bringt eine Nachricht, die alles, was bisher galt, in Frage stellt.'],
  ['Der falsche König', 26, 'Am Hof sitzt ein Herrscher, der nicht der ist, der er vorgibt zu sein; die Zeit zum Handeln ist knapp.'],
  ['Sturmsaison', 22, 'Eine Reihe von Unwettern zwingt die Gruppe, in einer fremden Stadt Unterschlupf zu suchen.'],
  ['Die Bibliothek', 26, 'In einem verlassenen Archiv liegt die Antwort auf eine Frage, die niemand zu stellen wagte.'],
  ['Der lange Winter', 26, 'Schnee schneidet das Land ab, und die Gruppe muss die Vorräte einer ganzen Region sichern.'],
  ['Zwei Wege', 24, 'Die Gefährten trennen sich und gehen getrennte Wege, die sich an einem unerwarteten Ort kreuzen.'],
  ['Das Erbe', 26, 'Ein Testament führt die Gruppe zu einem Anwesen, das mehr birgt als Gold und Papier.'],
  ['Feuerprobe', 26, 'Ein Brand legt die Hauptstadt in Schutt, und jeder muss entscheiden, wem er noch vertraut.'],
  ['Die Rückkehr', 20, 'Nach langer Abwesenheit kehrt die Gruppe heim und findet ihr Dorf verändert vor.'],
  ['Neue Ufer', 26, 'Eine Überfahrt in ein unbekanntes Land bringt neue Verbündete und alte Feinde zusammen.'],
  ['Der Markt der Masken', 26, 'Auf einem Festmarkt trägt jeder ein Gesicht, das nicht seins ist, und ein Dieb nutzt das aus.'],
  ['Lichtungen', 22, 'Im Wald verschwinden Reisende; die Spuren führen zu einer Lichtung, die auf keiner Karte steht.'],
  ['Der Pakt', 26, 'Ein Bündnis mit einstigen Gegnern wird geschlossen, aber nicht alle halten sich an die Abmachung.'],
  ['Die Brücke', 24, 'Der Bau einer Brücke soll zwei verfeindete Städte verbinden und weckt dabei alte Wunden.'],
  ['Nachtzug', 26, 'Eine Fahrt durch die Nacht wird zur Suche nach einer Person, die es auf dem Fahrplan nicht gibt.'],
  ['Das Fest der Laternen', 20, 'Ein Fest bringt das ganze Land zusammen, und mitten darin geschieht, was niemand erwartet hat.'],
  ['Wunder in Sicht', 13, 'Eine neue Reise beginnt: Die Gruppe folgt einem Hinweis auf ein Wunder, das nur zur Sturmzeit sichtbar wird.'],
  ['Letzte Karten', 26, 'Das Spiel um die letzten Karten entscheidet, wer am Ende die Grenzen des Landes neu zieht.'],
  ['Am Rand der Karte', 26, 'Die Gruppe bricht ins Grenzland auf, wo die Karten enden und die Geschichten beginnen.'],
  ['Das Ende der Reise', 26, 'Alle Fäden laufen zusammen: Die Gefährten stellen sich der Frage, die sie von Anfang an begleitet hat.'],
]

const STATUS_VON: Record<number, StaffelStatus> = { 22: 'laeuft', 23: 'angekuendigt', 24: 'angekuendigt', 25: 'angekuendigt' }

function anbieterVon(nr: number, status: StaffelStatus): string[] {
  if (status === 'angekuendigt') return nr === 23 ? ['RTL+'] : []
  if (nr <= 8) return ['Netflix', 'RTL+']
  return nr === 22 ? ['RTL+', 'TOGGO'] : ['RTL+']
}

function bauStaffeln(): Staffel[] {
  let von = 1
  return ROH.map(([name, folgen, handlung], i) => {
    const nr = i + 1
    const status = STATUS_VON[nr] ?? 'erschienen'
    const zeile: Staffel = { nr, name, folgen, von, status, jahr: 2003 + nr, anbieter: anbieterVon(nr, status), disc: status === 'erschienen' && nr % 3 !== 0, handlung }
    von += folgen
    return zeile
  })
}

export const STAFFELN: Staffel[] = bauStaffeln()

export const staffelMit = (nr: number): Staffel => STAFFELN.find((s) => s.nr === nr) ?? STAFFELN[0]!

export const STATUS_TEXT: Record<StaffelStatus, string> = { erschienen: 'erschienen', laeuft: 'läuft', angekuendigt: 'angekündigt' }

/** Kurzer Lesetext für Hilfsmittel: „Staffel 23, läuft“. */
export const reiterBeschriftung = (s: Staffel): string => `Staffel ${s.nr}, ${STATUS_TEXT[s.status]}`
