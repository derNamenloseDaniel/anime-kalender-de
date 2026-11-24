/**
 * Wächter (Z wie Zorro, 23.11.2026): Die Blase an der Pille („Deutsch laut Anbieter“, „Sprache offen“ …) bleibt im Bereich,
 * auch an der schmalsten Pille. Rendert die echte `Pille` mit jeder Blasenart samt dem gebauten CSS (`dist/`) in Chromium
 * und misst linken Rand der Blase gegen den des Bereichs, bei 375 px (Handy) und 480 px (Panel), hell und dunkel.
 * Aufruf (nach `npx vite build`): npx tsx tools/pille-blase-messen.ts   (Exit 1 bei Verletzung)
 */
import { readdirSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chromium } from 'playwright'
import { DubStatus, Pille, type DubStatusArt } from '../web/src/components/detail/pille.tsx'

const ARTEN: DubStatusArt[] = ['belegt', 'justwatch', 'schwester', 'annahme', 'anbieter', 'omu', 'offen']
const NAMEN = ['Joyn', 'ADN', 'RTL+', 'Arte']
const BREITEN = [375, 480]

const css = readdirSync('dist/assets').filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n')
const zeilen = ARTEN.flatMap((art) => NAMEN.map((name) => createElement('div', { key: `${art}-${name}`, className: 'pille-test mt-6' },
  createElement(Pille, { name, url: 'https://x', status: createElement(DubStatus, { art }) }))))
const html = renderToStaticMarkup(createElement('div', { id: 'bereich', className: 'p-0' }, zeilen))

const browser = await chromium.launch(process.env.AK_CHROME ? { executablePath: process.env.AK_CHROME } : {})
let verletzt = 0
try {
  for (const thema of ['hell', 'dunkel']) {
    for (const breite of BREITEN) {
      const seite = await browser.newPage({ viewport: { width: breite, height: 900 } })
      await seite.route('**/*', (r) => r.abort())
      await seite.setContent(`<!doctype html><html class="${thema === 'dunkel' ? 'dark' : ''}"><head><style>${css}</style></head><body><div style="width:${breite}px">${html}</div></body></html>`)
      const raus = await seite.evaluate(() => [...document.querySelectorAll('.pille-test')].flatMap((z) => {
        const blase = z.querySelector('a span.absolute') as HTMLElement
        const pille = z.querySelector('a') as HTMLElement
        const b = blase.getBoundingClientRect()
        const p = pille.getBoundingClientRect()
        return b.left < 0 || b.right > window.innerWidth ? [`${pille.innerText.trim().split('\n')[0]}/${blase.textContent}: Blase ${b.left | 0}…${b.right | 0}, Pille ${p.left | 0}…${p.right | 0}`] : []
      }))
      for (const r of raus) { verletzt++; console.error(`  ✖ ${thema} ${breite}px: ${r}`) }
      console.log(`  ${raus.length ? '✖' : '✓'} ${thema} ${breite}px: ${ARTEN.length * NAMEN.length} Blasen gemessen`)
      if (breite === 375 && process.env.PILLE_BILD) await seite.screenshot({ path: `${process.env.PILLE_BILD}-${thema}-${breite}.png`, fullPage: true })
      await seite.close()
    }
  }
} finally {
  await browser.close()
}
process.exit(verletzt ? 1 : 0)
