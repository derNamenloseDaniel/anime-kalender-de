import type { ComponentProps } from 'react'
import { PanelBuehne } from '../../src/components/detail/buehne.tsx'
import { kastenKlassen } from '../../src/components/detail/antwort-kasten-zustand.tsx'
import type { AntwortKastenMitMarke } from '../../src/components/detail/kasten-marke.tsx'
import { BuchZeichen, PanelKarte } from '../../src/components/detail/panel-karte.tsx'
import { STATUS_TEXT, staffelMit, type Staffel } from './staffel-abschnitt-daten.ts'
import { StaffelReiter } from './staffel-abschnitt-leiste.tsx'
import { useGewaehlteStaffel } from './staffel-abschnitt-zustand.ts'

/** Ein Platzhalter-Cover je Staffel (eigene Farbe und Nummer), damit der Wechsel des Covers im Bild zu sehen ist. */
export function coverVon(s: Staffel): string {
  const farbe = (s.nr * 47) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${farbe} 55% 42%)"/>` +
    `<stop offset="1" stop-color="hsl(${(farbe + 40) % 360} 60% 18%)"/></linearGradient></defs>` +
    `<rect width="300" height="450" fill="url(#g)"/>` +
    `<text x="150" y="150" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white" fill-opacity="0.8">Staffel</text>` +
    `<text x="150" y="270" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="120" fill="white">${s.nr}</text>` +
    `<text x="150" y="400" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white" fill-opacity="0.8">${s.jahr}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Variante A, Kopf: der echte Kopf, aber das Cover (auch das unscharfe Banner) gehört zur gewählten Staffel. */
export function KopfMitStaffelCover(eigenschaften: ComponentProps<typeof PanelBuehne>) {
  const s = staffelMit(useGewaehlteStaffel())
  return <PanelBuehne {...eigenschaften} buehnenBild={coverVon(s)} grossBild={undefined} title={{ ...eigenschaften.title, bannerImage: undefined }} />
}

function Anbieter({ name, ab }: { name: string; ab?: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-ak-rand bg-ak-flaeche px-3 text-t3 text-ak-text">
      <span className="font-semibold">{name}</span>
      {ab && <span className="text-t4 text-ak-leise">{ab}</span>}
    </li>
  )
}

/** Kopfzeile des Kastens: Überschrift mit Folgenzahl, darunter Name, Status und Zeitraum der Staffel. */
function KastenKopf({ s }: { s: Staffel }) {
  const folgen = s.status === 'laeuft' ? `Bisher ${s.folgen} Folgen auf Deutsch` : s.status === 'erschienen' ? `${s.folgen} Folgen auf Deutsch` : 'Deutsche Fassung angekündigt'
  const bis = s.von + s.folgen - 1
  return (
    <div>
      <h3 className="text-t2 font-bold text-ak-text">{folgen}</h3>
      <p className="mt-0.5 text-t4 text-ak-leise">
        Staffel {s.nr}: {s.name} ·{' '}
        <span className={s.status === 'laeuft' ? 'font-semibold text-ak-akzent-text' : ''}>
          {s.status === 'laeuft' && <span aria-hidden="true">● </span>}
          {STATUS_TEXT[s.status]}
        </span>
      </p>
      {s.status !== 'angekuendigt' && <p className="mt-0.5 text-t4 text-ak-leise">Folgen {s.von}–{s.status === 'laeuft' ? `${bis}, wird fortgesetzt` : bis} · {s.jahr}</p>}
    </div>
  )
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="pb-1.5 text-t4 font-bold tracking-wide text-ak-leise uppercase">{titel}</p>
      {children}
    </div>
  )
}

/** Die Wege der gewählten Staffel: Abo-Anbieter, bei der laufenden die nächsten TV-Sendungen, Disc. */
function KastenWege({ s }: { s: Staffel }) {
  const abAm = s.status === 'angekuendigt' ? 'ab 06.12.' : undefined
  return (
    <>
      {s.anbieter.length > 0 && (
        <Abschnitt titel="Abo">
          <ul className="flex flex-col gap-1.5">
            {s.anbieter.map((a) => <Anbieter key={a} name={a} ab={abAm} />)}
          </ul>
        </Abschnitt>
      )}
      {s.status === 'laeuft' && (
        <Abschnitt titel="TV">
          <ul className="flex flex-col gap-1.5">
            <Anbieter name="Super RTL" ab="Mo 12.10. 16:05" />
            <Anbieter name="TOGGO plus" ab="Mo 12.10. 17:05" />
          </ul>
        </Abschnitt>
      )}
      {s.status === 'angekuendigt' && s.anbieter.length === 0 && <p className="mt-3 text-t3 text-ak-leise">Noch kein deutscher Anbieter und kein Termin bekannt.</p>}
      {s.status === 'erschienen' && <Abschnitt titel="Disc"><p className="text-t3 text-ak-text">{s.disc ? 'DVD- und Blu-ray-Box erschienen' : 'Keine deutsche Disc bekannt'}</p></Abschnitt>}
    </>
  )
}

/** Variante A, Kasten: Reiterleiste darüber, der rote Kasten zeigt die Daten der gewählten Staffel. */
export function KastenMitReitern(eigenschaften: ComponentProps<typeof AntwortKastenMitMarke>) {
  const s = staffelMit(useGewaehlteStaffel())
  const klassen = kastenKlassen({ antwort: { art: 'laeuft' } as never, title: eigenschaften.title, neben: '', gedaempft: s.status === 'angekuendigt' && s.anbieter.length === 0 })
  return (
    <>
      <StaffelReiter />
      <section className={klassen} aria-label={`Staffel ${s.nr}`} role="tabpanel">
        <KastenKopf s={s} />
        <KastenWege s={s} />
      </section>
    </>
  )
}

/** Variante A, Handlung: Text der gewählten Staffel. */
export function HandlungDerStaffel() {
  const s = staffelMit(useGewaehlteStaffel())
  return (
    <PanelKarte symbol={<BuchZeichen />} titel="Handlung" akzent="akzent">
      <p className="text-t4 text-ak-leise">Staffel {s.nr}: {s.name}</p>
      <p className="mt-1 text-t3 text-ak-text/85">{s.handlung}</p>
    </PanelKarte>
  )
}
