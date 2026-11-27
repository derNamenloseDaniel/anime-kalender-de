import { log, readJson } from '../lib/util.ts'
import { spracheDerMeldung } from '../lib/sprachbefund.ts'
import { vorschlaegeAusAllenSammelartikeln } from '../lib/sammelartikel.ts'
import { quellenName, type Vorschlag } from '../lib/meldungen.ts'
import type { DubCheck } from '../lib/dub-confirmed.ts'
import { handbelegFuer, istDeutschBelegt, istSprachNotiz, kennung, netflixOriginalMitSynchro, quelleAusHandbeleg } from '../lib/deutsch-belegt.ts'
import { type Release, type Title } from '../../shared/types.ts'

/** Adressen der Anime2You-Meldungen (Einzel- und Sammelartikel), die eine deutsche Synchro zusagen. */
export function adressenMitSynchroZusage(): Set<string> {
  const roh = readJson<{ proposals?: Vorschlag[] }>('data/proposals/anime2you.json', {}).proposals ?? []
  return new Set([...roh, ...vorschlaegeAusAllenSammelartikeln(roh)].filter((v) => spracheDerMeldung(v) === 'ja').map((v) => v.articleUrl))
}

/** Hängt den Handbeleg als Quelle an den Termin (Anbieter-Adresse, Messung, Tag), ohne die bisherigen Quellen zu verändern. */
function belegAnhaengen(r: Release, beleg: DubCheck, heute: string): void {
  const quelle = quelleAusHandbeleg(r, beleg)
  const bisher = r.quellen ?? r.sources.map((url) => ({ url, name: quellenName(url), gesehenAm: heute, stand: 'aktuell' as const }))
  r.quellen = [...bisher.filter((q) => q.url !== quelle.url), quelle]
  if (!r.sources.includes(quelle.url)) r.sources.push(quelle.url)
}

/**
 * **Ist Deutsch für Titel und Anbieter belegt, gilt der Termin als Deutsch** (26.11.2026; Call of the Night 141391, JoJo Steel Ball Run 210482):
 * Die Meldung, die den Termin anlegte, kannte die Sprache nicht (`sprache: 'offen'` samt Hinweis „ob mit deutscher Synchro …“); später belegte die
 * Netflix-Erweiterung den deutschen Ton an derselben Adresse, und der Termin sagte weiter „Synchro offen“, das Panel zugleich „Deutsch“.
 * Räumt `sprache: 'offen'` und die Hinweise aus `SPRACH_NOTIZEN` ab; Termine mit `sprache: 'omu'` bleiben, ebenso jeder andere Hinweistext.
 * **Ein automatischer Termin behält „Synchro offen“, wo weder seine Quelle eine deutsche Synchro zusagt noch ein Handbeleg** (`data/dub-confirmed.yaml`,
 * gleicher Anbieter, passende Adresse) vorliegt (`autoReleaseWidersprueche`: nichts behaupten, was nicht belegt ist): dort genügt der Weg am Titel nicht.
 * Mit Handbeleg (27.11.2026, Fool Night 213457) wird der Termin geklärt und führt den Beleg als Quelle.
 * Setzt außerdem den Weg einer Netflix-Eigenproduktion auf `dub: true`, wo er nur geteilt, aber nicht belegt war. Läuft vor den Ereignissen (Phase 10).
 */
export function klaereDeutschBelegteTermine(releases: Release[], titles: Map<number, Title>, zusagen: Set<string>, handbelege: DubCheck[], heute: string): string[] {
  const geklaert: string[] = []
  for (const r of releases) {
    const title = titles.get(r.titleId)
    if (!title) continue
    if (netflixOriginalMitSynchro(r, title)) {
      const weg = title.streams.find((s) => s.platform === 'netflix' && s.dub === undefined && (!r.platformUrl || kennung(s.url) === kennung(r.platformUrl)))
      if (weg) weg.dub = true
    }
    if (r.sprache === 'omu' || !istDeutschBelegt(r, title) || (r.sprache !== 'offen' && !istSprachNotiz(r))) continue
    if (r.automatisch && !zusagen.has(r.sources[0] ?? '')) {
      const beleg = handbelegFuer(r, handbelege)
      if (!beleg) continue
      belegAnhaengen(r, beleg, heute)
    }
    if (r.sprache === 'offen') delete r.sprache
    if (istSprachNotiz(r)) delete r.hinweis
    geklaert.push(r.slug)
  }
  if (geklaert.length) log(`${geklaert.length} Termine mit belegtem Deutsch ohne „Synchro offen“ geführt: ${geklaert.join(', ')}`)
  return geklaert
}
