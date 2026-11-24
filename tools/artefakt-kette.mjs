/**
 * Artefakt-Kette zwischen dem Bestandsbau (`bestand-bauen.yml`, lädt bei Rot `bau-eingaben-<run_id>` hoch) und dem Untersucher
 * (`claude-reparatur.yml`, lädt es nach `data/`): beide Enden müssen zusammenpassen, sonst fehlt dem Untersucher still der Cache.
 * Nur lesen: `artefaktVerstoesse` bekommt die beiden geparsten Workflows und nennt jeden Bruch als Text (leer = in Ordnung).
 * actions/upload-artifact@v4 legt die Dateien relativ zum gemeinsamen Elternordner aller Pfade ab; die Download-`path` muss genau er sein.
 */
export const ARTEFAKT_VORSATZ = 'bau-eingaben-'
const UPLOAD = 'actions/upload-artifact'
const DOWNLOAD = 'actions/download-artifact'

function schritteMit(wf, aktion, vorsatz) {
  const treffer = []
  for (const job of Object.values(wf?.jobs ?? {})) {
    for (const s of job.steps ?? []) {
      if (String(s.uses ?? '').startsWith(`${aktion}@`) && String(s.with?.name ?? '').startsWith(vorsatz)) treffer.push(s)
    }
  }
  return treffer
}

/** Pfade eines Upload-Schritts: eine Zeile je Pfad, Ausschlüsse (`!…`) getrennt. */
export function uploadPfade(pfadText) {
  const zeilen = String(pfadText ?? '').split('\n').map((z) => z.trim()).filter(Boolean)
  return { ein: zeilen.filter((z) => !z.startsWith('!')), aus: zeilen.filter((z) => z.startsWith('!')).map((z) => z.slice(1)) }
}

/** Gemeinsamer Elternordner (ganze Pfadteile); eine Datei im Wurzelordner zählt als dessen Ordner. */
export function gemeinsamerOrdner(pfade) {
  const teile = pfade.map((p) => p.replace(/\/+$/, '').split('/').slice(0, -1))
  if (teile.length === 0) return ''
  const erster = teile[0]
  let n = 0
  while (n < erster.length && teile.every((t) => t[n] === erster[n])) n++
  return erster.slice(0, n).join('/')
}

export function artefaktVerstoesse(bauen, reparatur) {
  const fehler = []
  const hoch = schritteMit(bauen, UPLOAD, ARTEFAKT_VORSATZ)
  const runter = schritteMit(reparatur, DOWNLOAD, ARTEFAKT_VORSATZ)
  if (hoch.length !== 1) fehler.push(`bestand-bauen: ${hoch.length} Upload-Schritte mit Namen ${ARTEFAKT_VORSATZ}…, erwartet 1`)
  if (runter.length !== 1) fehler.push(`claude-reparatur: ${runter.length} Download-Schritte mit Namen ${ARTEFAKT_VORSATZ}…, erwartet 1`)
  if (fehler.length > 0) return fehler
  const [auf] = hoch
  const [ab] = runter
  if (auf.with.name !== `${ARTEFAKT_VORSATZ}\${{ github.run_id }}`) fehler.push(`Upload-Name ${auf.with.name} ist nicht ${ARTEFAKT_VORSATZ}\${{ github.run_id }}`)
  const lauf = '${{ github.event.workflow_run.id }}'
  if (ab.with.name !== `${ARTEFAKT_VORSATZ}${lauf}`) fehler.push(`Download-Name ${ab.with.name} nennt nicht den Bau-Lauf (${lauf})`)
  if (ab.with['run-id'] !== lauf) fehler.push(`Download-run-id ${ab.with['run-id']} ist nicht ${lauf}: ohne sie sucht der Download im eigenen Lauf`)
  const { ein, aus } = uploadPfade(auf.with.path)
  if (ein.length === 0) fehler.push('Upload ohne Pfade')
  const wurzel = gemeinsamerOrdner(ein)
  if (ab.with.path !== wurzel) fehler.push(`Download-path ${ab.with.path} ist nicht der gemeinsame Ordner der Upload-Pfade (${wurzel || 'Repo-Wurzel'})`)
  for (const a of aus) if (ein.every((p) => !a.startsWith(p))) fehler.push(`Ausschluss !${a} liegt unter keinem Upload-Pfad`)
  return fehler
}
