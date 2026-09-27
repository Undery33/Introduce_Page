import { spawnSync } from "node:child_process";
const result = spawnSync("node_modules/.bin/prisma", ["validate"], {
  stdio: "inherit",
  // Validation reads the schema only. This placeholder never opens a database.
  env: {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://validation:validation@127.0.0.1:5432/validation",
  },
});
process.exit(result.status ?? 1);
