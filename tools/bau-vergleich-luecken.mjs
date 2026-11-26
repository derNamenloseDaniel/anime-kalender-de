/**
 * Folgenlücken je Termin für `bau-vergleich.mjs`: `public/data/releases.json` führt in `schedule.observed` die gesichteten
 * Folgen (`{ "1": "2026-07-04" }`). Fehlt zwischen der kleinsten und größten Nummer eine, ist das eine Lücke; der Feldvergleich
 * zeigt eine neue oder verschwundene Lücke nur als geänderte Schlüssel von `observed`, nicht als das, was sie ist.
 */

const MAX_ZEILEN = 20

/** Fehlende Folgennummern zwischen der kleinsten und größten beobachteten Nummer. */
export function luecken(observed) {
  const nummern = Object.keys(observed ?? {}).map(Number).filter(Number.isInteger)
  if (nummern.length < 2) return []
  const da = new Set(nummern)
  const fehlt = []
  for (let n = Math.min(...nummern) + 1; n < Math.max(...nummern); n++) if (!da.has(n)) fehlt.push(n)
  return fehlt
}

/** Lücken je Termin-Kennung (`slug`) aus dem Text von releases.json; Termine ohne Lücke fehlen in der Karte. */
function sammle(text) {
  const karte = new Map()
  let liste
  try {
    liste = JSON.parse(text)
  } catch {
    return karte
  }
  for (const e of Array.isArray(liste) ? liste : []) {
    const fehlt = luecken(e?.schedule?.observed)
    if (fehlt.length) karte.set(e.slug, fehlt)
  }
  return karte
}

const zeigeNummern = (liste) => (liste.length > 6 ? `${liste.slice(0, 6).join(', ')}, … (${liste.length})` : liste.join(', '))

/** Zeilen für neu entstandene, verschwundene und veränderte Lücken zwischen zwei Fassungen von releases.json. */
export function lueckenDelta(alt, neu) {
  const a = sammle(alt)
  const b = sammle(neu)
  const zeilen = []
  for (const [slug, fehlt] of b) {
    if (!a.has(slug)) zeilen.push(`Folgenlücke neu: ${slug} ohne Folge ${zeigeNummern(fehlt)}`)
    else if (a.get(slug).join() !== fehlt.join()) zeilen.push(`Folgenlücke geändert: ${slug} ohne Folge ${zeigeNummern(a.get(slug))} → ${zeigeNummern(fehlt)}`)
  }
  for (const [slug, fehlt] of a) if (!b.has(slug)) zeilen.push(`Folgenlücke verschwunden: ${slug} ohne Folge ${zeigeNummern(fehlt)}`)
  return zeilen.length > MAX_ZEILEN ? [...zeilen.slice(0, MAX_ZEILEN), `… und ${zeilen.length - MAX_ZEILEN} weitere Lücken`] : zeilen
}
