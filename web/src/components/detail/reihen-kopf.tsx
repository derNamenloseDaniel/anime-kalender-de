import type { Translate } from '../../lib/i18n.tsx'

/** Kopf der Reihenliste bei langen Reihen: die Suche in einer festen Zeile von 44 px. */
export function ReihenKopf({ t, suche, onSuche }: { t: Translate; suche: string; onSuche: (text: string) => void }) {
  return (
    <div className="mb-1 flex h-11 items-center gap-2">
      <input
        type="search"
        value={suche}
        onChange={(e) => onSuche(e.target.value)}
        placeholder={t('detail.reiheSuche')}
        aria-label={t('detail.reiheSuche')}
        className="h-11 min-w-0 flex-1 rounded-lg border border-ak-rand bg-transparent px-3 text-t3"
      />
    </div>
  )
}
