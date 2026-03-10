import "dotenv/config";
import db from "./src/config/database.js";
import { responses } from "./src/db/schema.js";
import { desc } from "drizzle-orm";

async function main() {
  const r = await db
    .select()
    .from(responses)
    .orderBy(desc(responses.createdAt))
    .limit(1);
  console.log(r[0].responseText);
  process.exit(0);
}
main();
