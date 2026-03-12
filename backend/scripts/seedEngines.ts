import "dotenv/config";
import db, { aiEngines } from "../src/db/index";
import { eq } from "drizzle-orm";

async function seed() {
  const engines = [
    { name: "Gemini", domain: "gemini.google.com" },
    { name: "Claude", domain: "claude.ai" },
    { name: "ChatGPT", domain: "chatgpt.com" },
  ];

  for (const engine of engines) {
    const existing = await db
      .select()
      .from(aiEngines)
      .where(eq(aiEngines.name, engine.name));
    if (existing.length === 0) {
      await db.insert(aiEngines).values({
        name: engine.name,
        domain: engine.domain,
        isActive: true,
      });
      console.log(`✅ Seeded engine: ${engine.name}`);
    } else {
      console.log(`ℹ️ Engine already exists: ${engine.name}`);
    }
  }

  // Disable Perplexity if it exists
  const perplexity = await db
    .select()
    .from(aiEngines)
    .where(eq(aiEngines.name, "Perplexity"));
  if (perplexity.length > 0) {
    await db
      .update(aiEngines)
      .set({ isActive: false })
      .where(eq(aiEngines.name, "Perplexity"));
    console.log(`❌ Disabled Perplexity engine`);
  }

  console.log("Done seeding engines.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding engines:", err);
  process.exit(1);
});
