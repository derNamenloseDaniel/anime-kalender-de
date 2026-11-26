import { log } from '../lib/util.ts'
import { istDeutschBelegt, istSprachNotiz, kennung, netflixOriginalMitSynchro } from '../lib/deutsch-belegt.ts'
import { type Release, type Title } from '../../shared/types.ts'

/**
 * **Ist Deutsch für Titel und Anbieter belegt, gilt der Termin als Deutsch** (26.11.2026; Call of the Night 141391, JoJo Steel Ball Run 210482):
 * Die Meldung, die den Termin anlegte, kannte die Sprache nicht (`sprache: 'offen'` samt Hinweis „ob mit deutscher Synchro …“); später belegte die
 * Netflix-Erweiterung den deutschen Ton an derselben Adresse, und der Termin sagte weiter „Synchro offen“, das Panel zugleich „Deutsch“.
 * Räumt `sprache: 'offen'` und die Hinweise aus `SPRACH_NOTIZEN` ab; Termine mit `sprache: 'omu'` bleiben, ebenso jeder andere Hinweistext.
 * Setzt außerdem den Weg einer Netflix-Eigenproduktion auf `dub: true`, wo er nur geteilt, aber nicht belegt war. Läuft vor den Ereignissen (Phase 10).
 */
export function klaereDeutschBelegteTermine(releases: Release[], titles: Map<number, Title>): string[] {
  const geklaert: string[] = []
  for (const r of releases) {
    const title = titles.get(r.titleId)
    if (!title) continue
    if (netflixOriginalMitSynchro(r, title)) {
      const weg = title.streams.find((s) => s.platform === 'netflix' && s.dub === undefined && (!r.platformUrl || kennung(s.url) === kennung(r.platformUrl)))
      if (weg) weg.dub = true
    }
    if (r.sprache === 'omu' || !istDeutschBelegt(r, title) || (r.sprache !== 'offen' && !istSprachNotiz(r))) continue
    if (r.sprache === 'offen') delete r.sprache
    if (istSprachNotiz(r)) delete r.hinweis
    geklaert.push(r.slug)
  }
  if (geklaert.length) log(`${geklaert.length} Termine mit belegtem Deutsch ohne „Synchro offen“ geführt: ${geklaert.join(', ')}`)
  return geklaert
}
