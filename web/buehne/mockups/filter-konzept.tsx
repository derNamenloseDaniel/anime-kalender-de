import { mockup } from '../register.ts'
/* Der Nachbau des alten Standes (Vorher) wird von den Weichen geladen; der Import ordnet ihn diesem Mockup zu (`buehne-umfang`). */
import './filter-konzept-alt.ts'

/** Die Überlegungen hinter dem Filterkonzept (analyse.md, gegenpruefung.md, 22.11.2026), je ein Satz mit Nutzen für den Besucher. */
const UEBERLEGUNGEN = [
  '1 · Ausschließen heißt: diese Einträge nicht sehen, nicht diesen Anime nicht sehen — wer „Disc aus" wählt, findet Yaiba weiter, weil er streamt.',
  '2 · Kalender fragt „was kommt wann", Datenbank „was gibt es": eigene Filter, nichts wird von einer Ansicht in die andere mitgenommen.',
  '3 · Mehrere Bedingungen gelten für denselben Weg: „Netflix + Disc" findet nur, wo es Netflix-Disc gibt — also nichts Erfundenes.',
  '4 · Ein Film bleibt ein Film, auch auf Crunchyroll: „Crunchyroll + Film" zeigt weiter alle 115 Filme dort.',
  '5 · Nur Totes fällt weg („bestätigt" in der Datenbank, „Jahr" und doppeltes TV im Kalender); sonst gilt überall derselbe Griff.',
  '6 · Die Kachel zeigt nur Wege, die der Filter nicht trifft: Yaiba bei „Disc aus" mit Joyn statt Disc.',
  '7 · Nichts doppelt: Die Trefferzahl steht schon im Balken bzw. im Listenkopf; gesetzte Filter stehen als Chips unter der Leiste (Handy eine Zeile zum Scrollen), nicht noch einmal im Fenster.',
  '7b · Das Filterfenster nennt an Plattform, Art, Status und Schnellchips die Zahl der Titel („Netflix, 14 Titel"); 0 ist abgeblendet, bleibt aber tippbar. „ohne Synchro" und „Staffeln zusammenfassen" stehen am Handy über der Liste, die Schnellfläche ist einfarbig.',
  '8 · Das Push-Abo hängt nur am Kalender: ein Filter in der Datenbank stellt keine Benachrichtigung um.',
  '9 · Jahr bleibt das Jahr, in dem etwas bei uns erscheint; „Streambar" meint: kann ich es streamen (nicht „hat Synchro").',
  '10 · Alte Einstellungen bleiben erhalten: Beide Ansichten starten mit der Kopie, nichts springt.',
].join('\n')

/**
 * Filterkonzept auf der Bühne (Daniel, 22.11.2026): Vorher = der Stand von `main` (Nachbau der Weg-Prüfung und des gemeinsamen Speichers,
 * `filter-konzept-alt.ts`, über die Weichen `wege-filter` und `vorlieben`), Nachher = die echte App mit dem Weg-Modell und getrennten Speichern.
 * Fälle: Yaiba (Disc + Stream + TV) und Attack on Titan mit „Disc aus" in der Datenbank; Sakamoto Days mit dem Kalender-Auge „im Handel",
 * das die Datenbank nicht mehr berührt; Dan Da Dan (Netflix + Disc) und Detektiv Conan (kostenlos + Crunchyroll) verlangen denselben Weg; One Piece trägt zehn gesetzte Filter (Chipzeile im schlimmsten Fall). Keine eigenen Schalter: Leiste, Gerät und Thema liefert der Rahmen.
 */
mockup({
  name: 'filter-konzept',
  titel: 'Filterkonzept – Disc aus, getrennte Filter',
  ausschnitt: 'datenbank',
  faelle: ['yaiba-joyn', 'attack-on-titan', 'sakamoto-days', 'dan-da-dan', 'fernsehtag-detektiv-conan', 'one-piece'],
  suchadressen: {
    'yaiba-joyn': { q: 'Yaiba', xrt: 'disc' },
    'attack-on-titan': { q: 'Final Season', xrt: 'disc' },
    'sakamoto-days': { q: 'Sakamoto' },
    'dan-da-dan': { q: 'Dan Da Dan', p: 'netflix', rt: 'disc' },
    'fernsehtag-detektiv-conan': { q: 'Detektiv Conan', frei: '1', p: 'crunchyroll' },
    /* Schlimmster Fall der Chipzeile (S5): zehn gesetzte Filter (mit Suche), Handy eine scrollbare Zeile, Rechner umbrechend. */
    'one-piece': { q: 'One Piece', p: 'crunchyroll', xp: 'tv,netflix', xrt: 'disc,ova', xg: 'Ecchi,Horror', xkw: 'Cartoon', st: 'airing' },
  },
  varianten: {
    A: {
      ersatz: {},
      notiz: `Nachher: „Disc aus" blendet nur Disc-Einträge aus; der Titel bleibt, wenn es einen anderen Weg gibt. Das Kalender-Auge (Fall Sakamoto Days) ändert die Datenbank nicht.\n\nÜberlegungen:\n${UEBERLEGUNGEN}`,
    },
  },
})
