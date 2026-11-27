/*
  **Ein Film von der Prüfliste lässt sich von Hand melden** — eigene Datei, weil `melder.js` über der
  Zeilengrenze liegt (check:umfang). Lädt laut Manifest vor `melder.js`.

  Daniel am 22.11.2026 an „One Piece Fan Letter": Die Prüfliste sagt „Film — öffnen und melden", aber
  von Hand ging es nicht; nur „Alles durchgehen" konnte ihn melden. Im Player zeichnet die Erweiterung
  nichts (Daniel, 30.08.2026: „there should be no elements from the extension on screen"), und auf der
  Titelseite blieb der Knopf nach dem Anschauen abgeblendet („Nichts zu melden"), weil die Beschriftung
  mit gelesenen Tonspuren nie einen Text lieferte. Ein Film hat keine Folge, die man anklicken könnte.

  Jetzt bietet der Knopf **auf der Titelseite des Films** die Meldung an, sobald die Tonspuren dieses Films
  gelesen sind — nach dem Anschauen, beim Zurückkehren. Im Player bleibt das Bild frei.
*/

/**
 * Knopfzustand für einen Film nach dem Abspielen, sonst „nichts anbieten".
 * `adresse` ist die Titelkennung der Seite, `reihe` die des gelesenen Standes: nur wenn beide derselbe
 * Film sind, gehören die Tonspuren ihm (Made in Abyss stand einmal unter Haikyu!!, 21.09.2026).
 */
globalThis.akNetflixFilmKnopf = ({ spuren, deutsch, adresse, reihe, eintrag }) => {
  const staffeln = eintrag?.staffeln ?? []
  const einFilm = staffeln.length === 1 && Boolean(staffeln[0]?.film)
  if (!spuren?.length || !einFilm || !adresse || String(adresse) !== String(reihe)) return { text: null, klasse: null, aktiv: false }
  return deutsch
    ? { text: 'Film melden — Deutsch gehört', klasse: 'ak-ja', aktiv: true }
    : { text: 'Film melden — kein Deutsch', klasse: 'ak-nein', aktiv: true }
}
