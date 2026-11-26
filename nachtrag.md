## Nachtrag (Cloud-Nachbesserung, Konflikt)
Merge von origin/main in fix/tmdb-reste-2611 (539b967c8): Konflikte in tmdb-faellig.ts (Suchfehler-Bedingung und nah() beide erhalten) und tmdb-titel-lookup.ts (main-Zerlegung übernommen, Suchfehler-Vermerk über Rückgabe `fehler` von sucheTreffer).
public/data unverändert gegenüber main.
Grün: check-tmdb-suchfehler, -suche, -film-suche, -ablauf, -404-neusuche, tools/tmdb-*.test.mjs, tsc --noEmit.
