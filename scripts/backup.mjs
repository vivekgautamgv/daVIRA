import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const source = resolve(process.env.DAVIRA_DB_PATH || "data/davira.sqlite");
if (!existsSync(source)) throw Error("No database yet. Run the app first.");
const destination = resolve(
  process.argv[2] ||
    `data/backups/davira-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
if (destination === source || existsSync(destination))
  throw Error(
    "Choose a new backup filename. Existing files are not overwritten.",
  );
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  console.log(`Backup saved: ${destination}`);
} finally {
  db.close();
}
