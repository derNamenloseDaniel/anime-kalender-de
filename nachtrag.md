
## Nachtrag (Kette grün, Kopf 2e3d0cc20d05)

Ursache: Die Patch-Note `staffelstart-nur-bei-erster-folge` schrieb im Untertitel „Ranma ½", die Seite zeigt „Ranma 1/2" (Check Patch-Notes-Titel, Kette – Logik 1).
Änderung: Untertitel auf „Ranma 1/2 und Das Band der Unterwelt bei Netflix" (`data/patchnotes/staffelstart-nur-bei-erster-folge.yaml`); Titelschreibweise in `public/data/titles.json` nachgesehen.
Beleg: `npx tsc --noEmit -p .` grün. `check-patchnotes-titel.ts` prüft Patch-Notes nur im PR-Ereignis, lokal läuft nur der Selbsttest (grün), „vorher rot" ist daher lokal nicht zeigbar. Merge mit origin/main war nicht möglich (unverwandte Historien, add/add-Konflikt in worker/src/pruefung.ts), deshalb nicht gemergt.
