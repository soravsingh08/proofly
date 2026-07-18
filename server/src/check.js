// "Build" for a no-build Node server: import every module once so
// syntax errors, broken imports and missing deps fail HERE, not at
// boot on the server. Run: npm run build
import { readdirSync } from "node:fs";

// dummy env so config modules (passport) can load without a real .env
process.env.JWT_SECRET ||= "check";
process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/check";

const files = readdirSync(new URL(".", import.meta.url), { recursive: true })
  .map(String)
  .filter(
    (f) =>
      f.endsWith(".js") &&
      !f.includes("check.js") &&
      f !== "index.js" && // connects + listens on import
      !f.startsWith("seed") // seed scripts connect to the DB on import
  )
  .sort();

let failed = 0;
for (const f of files) {
  try {
    await import(`./${f}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${f}\n  ${err.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} of ${files.length} modules broken`);
  process.exit(1);
}
console.log(`✓ ${files.length} modules load clean`);
process.exit(0);
