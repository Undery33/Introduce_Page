import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("build/index.js", import.meta.resolve("prisma/package.json")),
    ),
    "validate",
  ],
  {
    stdio: "inherit",
    // Validation reads the schema only. This placeholder never opens a database.
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://validation:validation@127.0.0.1:5432/validation",
    },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
