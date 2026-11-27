export const BAU_VARIABLEN: string[]
export const CI_TOKEN_VARIABLEN: string[]
export const GEHEIMNIS_VARIABLEN: string[]
export const CI_ANMELDUNG_DURCHREICHUNG: Record<string, string[]>
export function mitCiAnmeldung(env: NodeJS.ProcessEnv, datei: string, quelle?: NodeJS.ProcessEnv): NodeJS.ProcessEnv
export function ohneBauVariablen(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv
export function ohneCiToken(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv
export function ohneGeheimnisse(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv
