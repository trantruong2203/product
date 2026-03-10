import "dotenv/config";
import db from "./src/config/database.js";
import { citations, responses } from "./src/db/schema.js";
import { isNull, desc } from "drizzle-orm";

async function main() {
  const cits = await db
    .select()
    .from(citations)
    .where(isNull(citations.position))
    .orderBy(desc(citations.id))
    .limit(10);
  console.log("citations with null position: ", cits.length);
  for (const c of cits) {
    console.log("----");
    console.log("Brand:", c.brand);
    console.log("Context:\n", c.context);
  }
  process.exit(0);
}
main();
