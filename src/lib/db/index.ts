import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please configure your database connection.",
  );
}

export const db = drizzle(dbUrl, { schema });

export * from "./schema";
