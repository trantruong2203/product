import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import dotenv from "dotenv";
import * as schema from "./db/schema";

dotenv.config();

async function runMigration() {
  try {
    console.log("Running migrations...");
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed successfully");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
