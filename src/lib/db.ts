import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as unknown as {
  underyDatabase?: PrismaClient;
};
export function getDatabase(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return (globalDatabase.underyDatabase ??= new PrismaClient());
}
