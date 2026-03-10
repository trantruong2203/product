import "dotenv/config";
import db from "./src/config/database.js";
import { citations } from "./src/db/schema.js";
import { isNotNull, desc } from "drizzle-orm";

async function main() {
  const cits = await db
    .select()
    .from(citations)
    .where(isNotNull(citations.position))
    .orderBy(desc(citations.createdAt))
    .limit(10);
  if (cits.length === 0) {
    console.log("ALL POSITIONS ARE STILL NULL!");
  } else {
    console.log(`Found ${cits.length} positions!`);
    for (const c of cits) {
      console.log(
        `Brand: ${c.brand} | Pos: ${c.position} | Context: ${c.context}`,
      );
    }
  }
  process.exit(0);
}
main();
