/**
 * Batch insert prompts into database
 * Usage: npx tsx src/scripts/insertPrompts.ts <projectId> [limit]
 */

import { eq } from 'drizzle-orm';
import db from '../config/database.js';
import { prompts } from '../db/schema.js';
import { generatePrompts, GeneratedPrompt } from './generatePrompts.js';

export interface InsertPromptsOptions {
  projectId: string;
  customPrompts?: GeneratedPrompt[];
  limit?: number;
}

/**
 * Insert prompts in batches
 */
export async function insertPrompts(options: InsertPromptsOptions): Promise<number> {
  const { projectId, customPrompts, limit } = options;
  
  console.log(`Generating prompts for project: ${projectId}`);

  let promptData: GeneratedPrompt[];

  if (customPrompts && customPrompts.length > 0) {
    // Use custom prompts from parameter
    promptData = customPrompts;
    console.log(`Using ${promptData.length} custom prompts`);
  } else {
    // Generate from default templates
    promptData = generatePrompts(projectId);
  }

  if (limit && limit > 0) {
    promptData = promptData.slice(0, limit);
    console.log(`Limiting to ${limit} prompts`);
  }

  console.log(`Total prompts to insert: ${promptData.length}`);

  // Get existing prompt queries for this project to avoid duplicates
  const existingPrompts = await db
    .select({ query: prompts.query })
    .from(prompts)
    .where(eq(prompts.projectId, projectId));

  const existingQueries = new Set(existingPrompts.map(p => p.query.toLowerCase()));
  console.log(`Existing prompts in DB: ${existingQueries.size}`);

  // Filter out duplicates
  const newPrompts = promptData.filter(p => !existingQueries.has(p.query.toLowerCase()));
  console.log(`New prompts to insert: ${newPrompts.length}`);

  if (newPrompts.length === 0) {
    console.log('No new prompts to insert');
    return 0;
  }

  // Insert in batches
  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < newPrompts.length; i += batchSize) {
    const batch = newPrompts.slice(i, i + batchSize);

    const values = batch.map((p) => ({
      projectId,
      query: p.query,
      language: p.language || 'en',
      isActive: true,
    }));

    await db.insert(prompts).values(values);
    inserted += values.length;
    console.log(`Inserted ${inserted}/${newPrompts.length} prompts`);
  }

  return inserted;
}

/**
 * CLI entry point
 */
async function main() {
  const projectId = process.argv[2];
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

  if (!projectId) {
    console.error('Usage: npx tsx src/scripts/insertPrompts.ts <projectId> [limit]');
    console.error('Example: npx tsx src/scripts/insertPrompts.ts my-project-123 10000');
    process.exit(1);
  }

  try {
    const count = await insertPrompts({ projectId, limit });
    console.log(`\n=== Summary ===`);
    console.log(`Successfully inserted ${count} prompts for project: ${projectId}`);
  } catch (error) {
    console.error('Error inserting prompts:', error);
    process.exit(1);
  }
}

main().catch(console.error);
