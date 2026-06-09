import fs from "fs"

const src = fs.readFileSync("services/i18n.ts", "utf8")
const frMatch = src.match(/fr:\s*\{([\s\S]*?)\n  \},\n  en:/)
const enMatch = src.match(/en:\s*\{([\s\S]*?)\n  \},\n\} as const/)
if (!frMatch || !enMatch) {
  console.error("parse fail")
  process.exit(1)
}

fs.mkdirSync("services/messages", { recursive: true })

fs.writeFileSync(
  "services/messages/fr.ts",
  `import { appTranslationsFr } from "../i18n-app-fr"\n\nexport const messages = {${frMatch[1]}} as const\n`,
)
fs.writeFileSync(
  "services/messages/en.ts",
  `import { appTranslationsEn } from "../i18n-app-en"\n\nexport const messages = {${enMatch[1]}} as const\n`,
)

console.log("messages created")
