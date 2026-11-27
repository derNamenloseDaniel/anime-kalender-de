import { type PlatformId, PLATFORMS } from '@shared/types.ts'

export const WORKER_URL = import.meta.env.VITE_NEWSLETTER_API ?? ''

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ak-rand bg-ak-flaeche p-5">
      {children}
    </div>
  )
}

export function PlatformToggleList({
  platforms,
  selected,
  onToggle,
  allLabel,
  onAll,
}: {
  platforms: PlatformId[]
  selected: PlatformId[] | 'all'
  onToggle: (p: PlatformId) => void
  allLabel?: string
  onAll?: () => void
}) {
  const isAll = selected === 'all'
  return (
    <div className="flex flex-wrap gap-1.5">
      {allLabel && onAll && (
        <button
          type="button"
          onClick={onAll}
          className={[
            'ak-tz cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition',
            isAll
              ? 'border-ak-gut bg-ak-gut-grund text-ak-text'
              : 'border-ak-rand text-ak-leise',
          ].join(' ')}
        >
          {allLabel}
        </button>
      )}
      {platforms.map((p) => {
        const active = !isAll && selected.includes(p)
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p)}
            className={[
              'ak-tz cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition',
              active
                ? 'border-ak-gut bg-ak-gut-grund text-ak-text'
                : 'border-ak-rand text-ak-leise hover:border-ak-leise',
            ].join(' ')}
          >
            {PLATFORMS[p].name}
          </button>
        )
      })}
    </div>
  )
}

export type FormState = 'idle' | 'sending' | 'ok' | 'error'
