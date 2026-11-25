/**
 * Teilschritte von `runMonitor` (index.ts): Prüfung samt Nachprüfung, Stände schreiben,
 * Störungsmeldung, Wochenübersicht. Reiner Umbau, die Reihenfolge der Aufrufe bleibt.
 */
import { weekdayIndex } from '../../shared/time.ts'
import type { Env } from './env.ts'
import { sendeUndZaehle } from './mail-zaehler.ts'
import { checkAllSites, confirmOutages, type CheckResult } from './monitor.ts'
import { schreibeStaende, schreibeVerlauf } from './monitor-speicher.ts'
import { ladeMesswerte } from './monitor-statistik.ts'
import { BRAND, outageMail, weeklyStatusMail } from './templates.ts'

/** Eine geprüfte Seite samt Stand, an dem die Alarmschwelle hängt. */
export interface MonitorZeile {
  name: string
  url: string
  ok: boolean
  reason?: string
  ms: number
  downSince?: string
  failStreak: number
}

export interface PruefErgebnis {
  /** Erster Durchlauf, vor der Nachprüfung. */
  ersterLauf: CheckResult[]
  /** Stand nach der Nachprüfung: wer sich erholt hat, gilt als erreichbar, der Grund bleibt. */
  results: CheckResult[]
}

/**
 * Rote Seiten sofort nachprüfen, statt bis zum nächsten Stundenlauf zu warten.
 * Erst was auch danach noch schweigt, gilt als Störung — und der Stand in der
 * Datenbank ist dann schon der bestätigte, damit `/status` und das
 * Admin-Panel keinen Aussetzer als Ausfall zeigen.
 */
export async function pruefeMitNachpruefung(): Promise<PruefErgebnis> {
  const ersterLauf = await checkAllSites()
  const bestaetigt = await confirmOutages(ersterLauf.filter((r) => !r.ok))
  const bestaetigteUrls = new Set(bestaetigt.map((r) => r.site.url))
  const results = ersterLauf.map((r) => {
    if (r.ok || bestaetigteUrls.has(r.site.url)) return r
    // Hat sich beim Nachprüfen erholt: als erreichbar führen, aber den Grund
    // behalten — im Wochenbericht ist „war kurz weg" eine nützliche Auskunft.
    return { ...r, ok: true, reason: `kurzzeitig: ${r.reason ?? 'nicht erreichbar'}` }
  })
  return { ersterLauf, results }
}

/** Vorherige Stände laden, um „seit wann weg" beantworten zu können, und daraus die Zeilen bauen. */
async function baueZeilen(db: D1Database, results: CheckResult[]) {
  const { results: previous } = await db
    .prepare('SELECT url, last_ok_at, fail_streak FROM site_status')
    .all<{ url: string; last_ok_at: string | null; fail_streak: number }>()
  const before = new Map((previous ?? []).map((row) => [row.url, row]))
  const lines: MonitorZeile[] = results.map((r) => {
    const old = before.get(r.site.url)
    return {
      name: r.site.name,
      url: r.site.url,
      ok: r.ok,
      reason: r.reason,
      ms: r.ms,
      downSince: r.ok ? undefined : (old?.last_ok_at ?? undefined),
      // Derselbe Wert, der gleich in die Datenbank geschrieben wird — hier
      // schon gebraucht, weil die Alarmschwelle daran hängt.
      failStreak: r.ok ? 0 : (old?.fail_streak ?? 0) + 1,
    }
  })
  return { lines, before }
}

/**
 * Seiten, die aus SITES entfernt wurden, blieben als Zeile stehen und damit
 * auf ihrem letzten Stand — meist rot, weil sie ja wegen eines Fehlers
 * herausgenommen wurden. In /status und im Admin-Panel sah das aus wie eine
 * dauerhafte Störung, obwohl gar nichts mehr geprüft wird.
 */
async function raeumeVerwaiste(db: D1Database, results: CheckResult[]): Promise<void> {
  const known = results.map((r) => r.site.url)
  // Die Wächter-Liste ist fest im Code, leer werden kann sie nur durch einen
  // Fehler — dann aber würde `NOT IN ()` als SQL-Syntaxfehler den ganzen Lauf
  // abbrechen und aus einem Versehen einen Ausfall der Überwachung machen.
  // Und ein Aufräumen ohne bekannte Seiten hieße: alles löschen.
  if (!known.length) return
  await db
    .prepare(`DELETE FROM site_status WHERE url NOT IN (${known.map((_, i) => `?${i + 1}`).join(', ')})`)
    .bind(...known)
    .run()
}

/** Stände und Verlauf in die Datenbank schreiben, verwaiste Seiten entfernen; liefert die Zeilen. */
export async function schreibeLauf(db: D1Database, results: CheckResult[], nowIso: string): Promise<MonitorZeile[]> {
  const { lines, before } = await baueZeilen(db, results)
  await schreibeStaende(
    db,
    results,
    lines.map((l) => l.failStreak),
    new Map([...before].map(([url, row]) => [url, row.last_ok_at])),
    nowIso,
  )
  await schreibeVerlauf(db, results, nowIso)
  await raeumeVerwaiste(db, results)
  return lines
}

/** Erzwungene Läufe sind kein Tagesereignis: sie lesen den Sendeschlüssel nicht und schreiben ihn nicht. */
async function schonGesendet(env: Env, key: string, force: 'alert' | 'weekly' | undefined) {
  return force ? null : await env.DB.prepare('SELECT run_key FROM send_log WHERE run_key = ?1').bind(key).first()
}

async function merkeGesendet(env: Env, key: string, nowIso: string, force: 'alert' | 'weekly' | undefined): Promise<void> {
  if (force) return
  await env.DB.prepare('INSERT OR REPLACE INTO send_log (run_key, sent_at, recipients) VALUES (?1, ?2, 1)')
    .bind(key, nowIso)
    .run()
}

export interface MeldeKontext {
  env: Env
  to: string
  lines: MonitorZeile[]
  confirmed: MonitorZeile[]
  iso: string
  nowIso: string
  force?: 'alert' | 'weekly'
}

/** Störungsmeldung, höchstens einmal am Tag; ein erzwungener Lauf schickt auch ohne Störung. */
export async function meldeStoerung(k: MeldeKontext): Promise<string> {
  const key = `alert:${k.iso}`
  if (await schonGesendet(k.env, key, k.force)) return 'Störungsmail heute bereits verschickt'
  // Ohne bestätigte Störung kann nur ein erzwungener Lauf hier landen —
  // dann geht eine Testmail mit der ersten Seite als Beispiel hinaus, und
  // die Vorlage benennt das auch so.
  const report = k.confirmed.length ? k.confirmed : k.lines.slice(0, 1)
  const mail = outageMail(report, k.lines.length, k.env.SITE_URL, k.lines.length - k.confirmed.length)
  await sendeUndZaehle(k.env, { to: k.to, ...mail, fromName: BRAND.monitor.name })
  await merkeGesendet(k.env, key, k.nowIso, k.force)
  return 'Störungsmail verschickt'
}

/** Kalenderwoche als Schlüssel: so kommt die Mail auch dann genau einmal, wenn der Cron in derselben Stunde mehrfach feuert. */
function wochenSchluessel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const week = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / (7 * 86400000)) + 1
  return `weekly-status:${y}-W${String(week).padStart(2, '0')}`
}

/** Ist jetzt der Montag-Slot der Wochenübersicht (oder wurde sie erzwungen)? */
export function istWochenSlot(env: Env, iso: string, hour: number, force?: 'alert' | 'weekly'): boolean {
  const sendHour = Number(env.SEND_HOUR_BERLIN || '7')
  const isWeeklySlot = weekdayIndex(iso) === 0 && hour === sendHour
  return isWeeklySlot || force === 'weekly'
}

/** Wochenübersicht, auch wenn alles läuft — als Lebensnachweis der Überwachung selbst. */
export async function meldeWoche(k: MeldeKontext): Promise<string> {
  const key = wochenSchluessel(k.iso)
  if (await schonGesendet(k.env, key, k.force)) return 'Wochenübersicht diese Woche bereits verschickt'
  const mail = weeklyStatusMail(k.lines, k.env.SITE_URL, await ladeMesswerte(k.env.DB, k.nowIso))
  await sendeUndZaehle(k.env, { to: k.to, ...mail, fromName: BRAND.monitor.name })
  await merkeGesendet(k.env, key, k.nowIso, k.force)
  return 'Wochenübersicht verschickt'
}
