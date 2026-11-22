/** Prüfsatz für tools/handlung-ueberschneidung.mjs: feste Texte, kein Netz. */
import assert from 'node:assert/strict'
import { findeUeberschneidungen, findeUebersetzungen, htmlZuText, istAniSearch, pruefeEintrag } from './handlung-ueberschneidung.mjs'

let fehler = 0
async function fall(name, fn) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (e) {
    fehler++
    console.log(`  FEHL ${name}: ${e.message}`)
  }
}

const QUELLE = { name: 'Q', text: 'Der junge Held, Ren, zieht aus; um die Welt zu retten und alle Freunde wiederzufinden.' }

await fall('genau 5 gemeinsame Wörter werden gemeldet', () => {
  const f = findeUeberschneidungen('Er muss um die Welt zu retten kämpfen', [QUELLE])
  assert.equal(f.length, 1)
  assert.equal(f[0].laenge, 5)
  assert.equal(f[0].folge, 'um die welt zu retten')
})

await fall('4 gemeinsame Wörter sind erlaubt (Fenster 5, nicht 4)', () => {
  assert.deepEqual(findeUeberschneidungen('Sie will die Welt zu retten', [QUELLE]), [])
})

await fall('Groß-/Kleinschreibung und Satzzeichen zählen nicht (Normalisierung)', () => {
  const f = findeUeberschneidungen('DER JUNGE HELD — „Ren“ — zieht aus', [QUELLE])
  assert.equal(f.length, 1)
  assert.equal(f[0].folge, 'der junge held ren zieht aus')
  assert.equal(f[0].laenge, 6)
})

await fall('Fund nennt die richtige Quelle bei mehreren Quellen', () => {
  const f = findeUeberschneidungen('der junge held ren zieht aus', [{ name: 'A', text: 'ganz anderer Text' }, QUELLE, { name: 'C', text: 'noch einer' }])
  assert.deepEqual(f.map((x) => x.quelle), ['Q'])
})

await fall('aniSearch-Adressen erkannt, andere nicht', () => {
  assert.equal(istAniSearch('https://www.anisearch.de/anime/13491'), true)
  assert.equal(istAniSearch('https://anisearch.com/anime/1'), true)
  assert.equal(istAniSearch('https://de.wikipedia.org/wiki/Anisearch'), false)
})

await fall('HTML ohne Tags, Skripte entfallen', () => {
  const t = htmlZuText('<p>Eins <b>zwei</b></p><script>var x = "drei vier"</script>')
  assert.match(t, /Eins\s+zwei/)
  assert.doesNotMatch(t, /drei/)
})

await fall('pruefeEintrag: aniSearch nie abgerufen, Fehler übersprungen, Pause je Quelle', async () => {
  const abgerufen = []
  const pausen = []
  const holeText = async (url) => {
    abgerufen.push(url)
    if (url.includes('kaputt')) throw new Error('HTTP 429')
    return QUELLE.text
  }
  const eintrag = {
    id: 1,
    text: 'der junge held ren zieht aus',
    quellen: [
      { name: 'aniSearch', url: 'https://www.anisearch.de/anime/1' },
      { name: 'Kaputt', url: 'https://example.org/kaputt' },
      { name: 'Gut', url: 'https://example.org/gut' },
    ],
  }
  const r = await pruefeEintrag(eintrag, holeText, async (ms) => pausen.push(ms))
  assert.deepEqual(abgerufen, ['https://example.org/kaputt', 'https://example.org/gut'])
  assert.equal(r.funde.length, 1)
  assert.equal(r.uebersprungen.length, 2)
  assert.deepEqual(pausen, [1000, 1000])
})

// Echte Fälle (AniList-Beschreibungen, abgerufen 22.11.2026). Übersetzung: nah am Klappentext von 101343; eigen: Text 102501 aus data/handlung-eigen.yaml.
const ANILIST_101343 = `The enigmatic Abyss is an unforgiving and deadly place. Despite the dangers, it still captures the imagination of explorers such as Riko who wishes to follow in her mother’s footsteps and trains hard to become a Cave Raider. One day, she receives news that her mother died in the Abyss, yet a mysterious note tells Riko that her mother may still be alive. Vowing to uncover the truth about her mother’s fate, Riko embarks on a journey with a humanoid robot boy named Reg. Together they will discover if they have what it takes to survive where so many others have perished.`
const UEBERSETZUNG_101343 = `Die rätselhafte Abyss ist ein unerbittlicher und tödlicher Ort. Trotz der Gefahren beflügelt sie noch immer die Fantasie von Entdeckern wie Riko, die in die Fußstapfen ihrer Mutter treten will und hart trainiert, um Cave Raider zu werden. Eines Tages erhält sie die Nachricht, dass ihre Mutter im Abyss gestorben ist, doch eine geheimnisvolle Notiz sagt Riko, dass ihre Mutter noch am Leben sein könnte. Entschlossen, die Wahrheit über das Schicksal ihrer Mutter herauszufinden, begibt sich Riko mit einem humanoiden Roboterjungen namens Reg auf eine Reise. Gemeinsam finden sie heraus, ob sie das Zeug dazu haben, dort zu überleben, wo so viele andere umgekommen sind.`
const ANILIST_102501 = `Set in the Henan Province of China during the 17th century, three teenagers are sent to a Shaolin Temple to learn the style of Kung Fu against a ruthless Demon, not seen since the Sui Dynasty, who terrorizes the province in order to search for two magic books to create more power and being stronger in world domination.`
const EIGEN_102501 = `Animationsserie mit 26 Folgen, die im China des 17. Jahrhunderts spielt. Der Dämon Heihu ist aus seinem Gefängnis entkommen, in das ihn drei Shaolin-Ritter vor tausend Jahren gebannt hatten, und bedroht die Provinz Henan. Meister Sanzang vom Shaolin-Kloster sucht die Wiedergeborenen dieser Ritter und findet drei Kinder: Hua, Cheng und Tang. Sie lernen Kampfkunst, Magie und Heilkunst, damit sie gegen Heihu antreten können.`

await fall('Übersetzung des Klappentexts: kein 5-Wort-Fund, aber Übersetzungsverdacht', () => {
  const quellen = [{ name: 'AniList', text: ANILIST_101343 }]
  assert.deepEqual(findeUeberschneidungen(UEBERSETZUNG_101343, quellen), [])
  const u = findeUebersetzungen(UEBERSETZUNG_101343, quellen)
  assert.equal(u.length, 1)
  assert.equal(u[0].quelle, 'AniList')
})

await fall('eigener Text bleibt ohne Verdacht (knapp unter der Schwelle, im Längenfenster)', () => {
  assert.deepEqual(findeUebersetzungen(EIGEN_102501, [{ name: 'AniList', text: ANILIST_102501 }]), [])
})

await fall('pruefeEintrag meldet die Übersetzung samt Zahlen', async () => {
  const r = await pruefeEintrag({ id: 2, text: UEBERSETZUNG_101343, quellen: [{ name: 'AniList', url: 'https://anilist.co/anime/101343' }] }, async () => ANILIST_101343, async () => {})
  assert.equal(r.funde.length, 0)
  assert.equal(r.uebersetzungen.length, 1)
})

console.log(fehler ? `${fehler} Fall/Fälle fehlgeschlagen` : 'handlung-ueberschneidung: alle Fälle ok')
process.exit(fehler ? 1 : 0)
