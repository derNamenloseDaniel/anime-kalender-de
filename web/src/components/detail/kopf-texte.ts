import { FORMAT_DE } from '@shared/mappings.ts'
import type { Title, FranchiseMember } from '@shared/types.ts'
import { jpAngabe } from './kino.tsx'
import type { Translate } from '../../lib/i18n.tsx'

/** Zweite Zeile unter dem Namen: der Teil der Reihe („Staffel 3“) und die Folgenzahl (wo der Kasten sie nicht nennt); die Altersfreigabe steht daneben (`fskAngabeVon`). */
export function unterzeileVon(title: Title, teil: string | undefined, folgenImKasten: boolean, t: Translate): string {
  return [teil, title.episodes && title.episodes > 1 && !folgenImKasten ? `${title.episodes} ${t('detail.episodes')}` : undefined]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Die Altersfreigabe im Kopf: kurz „FSK 6“ (bei Ableitung „≈ FSK 6“); der Zusatz „laut Anbieter“ bzw. „wie die anderen Teile“
 * steht im Hinweis, damit die Zeile am Handy einzeilig bleibt (Daniel, 24.11.2026). „ab 0“ sagt nichts — nur ab 6 aufwärts (11.10.2026).
 */
export function fskAngabeVon(title: Title, t: Translate): { text: string; hinweis?: string } | undefined {
  if (!title.fsk) return undefined
  const kurz = t('antwort.fsk', { n: title.fsk })
  if (!title.fskQuelle) return { text: kurz }
  const franchise = title.fskQuelle === 'franchise'
  return { text: franchise ? `≈ ${kurz}` : kurz, hinweis: t(franchise ? 'antwort.fskFranchise' : 'antwort.fskAnbieter', { n: title.fsk }) }
}

/** Dritte Zeile: Format, Laufzeit (nur hier), Start und Studio. */
export function metaVon(title: Title, eigenerTeil: FranchiseMember | undefined, t: Translate): string {
  return [
    title.format ? (FORMAT_DE[title.format] ?? title.format) : undefined,
    title.runtimeMin ? t(title.episodes && title.episodes > 1 ? 'detail.laufzeitJe' : 'detail.laufzeit', { n: title.runtimeMin }) : undefined,
    jpAngabe(eigenerTeil?.jpStart ?? (title.westlich ? title.jpStart : undefined), title.jpYear, title.land),
    title.studios?.[0],
  ]
    .filter(Boolean)
    .join(' · ')
}
