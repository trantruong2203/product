import "dotenv/config";
import db from "./src/config/database.js";
import { responses } from "./src/db/schema.js";
import { desc } from "drizzle-orm";
import { detectBrandMentions } from "./src/utils/parser.js";

async function main() {
  const r = await db
    .select()
    .from(responses)
    .orderBy(desc(responses.createdAt))
    .limit(1);
  const mentions = detectBrandMentions(r[0].responseText, "Nike", "nike.com");
  console.log(mentions);
  process.exit(0);
}
main();
