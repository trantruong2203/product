/**
 * Generate prompt dataset from templates
 * Usage: npx tsx src/scripts/generatePrompts.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GeneratedPrompt {
  query: string;
  intent: 'commercial' | 'informational' | 'comparison' | 'problem-solving';
  category: string;
  language: string;
}

/**
 * Load seed data from JSON files
 */
function loadSeedData() {
  const dataDir = path.join(__dirname, '..', 'data', 'seeds');

  const products = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')
  ).products;

  const brandsData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'brands.json'), 'utf-8')
  );

  const useCasesData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'useCases.json'), 'utf-8')
  );

  return {
    products,
    brands: brandsData.brands,
    competitors: brandsData.competitors,
    use_cases: useCasesData.use_cases,
    problems: useCasesData.problems,
  };
}

/**
 * Load templates
 */
import { templates, years } from '../data/templates.js';

/**
 * Normalize text for deduplication
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate prompts using Cartesian product approach
 * This creates 100k+ prompts efficiently
 */
export function generatePrompts(projectId: string): GeneratedPrompt[] {
  const data = loadSeedData();
  const results: Map<string, GeneratedPrompt> = new Map();

  // Helper: random item from array
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Generate using templates
  for (const template of templates) {
    const pattern = template.pattern;

    // Case 1: Simple {product} only
    if (!pattern.includes('{use_case}') &&
        !pattern.includes('{brand}') &&
        !pattern.includes('{competitor}') &&
        !pattern.includes('{problem}') &&
        !pattern.includes('{year}')) {
      for (const product of data.products) {
        const query = pattern.replace('{product}', product);
        const key = normalize(query);
        if (!results.has(key)) {
          results.set(key, {
            query,
            intent: template.intent,
            category: template.category,
            language: 'en',
          });
        }
      }
    }

    // Case 2: {product} + {use_case}
    else if (pattern.includes('{product}') && pattern.includes('{use_case}')) {
      for (const product of data.products) {
        for (const useCase of data.use_cases) {
          const query = pattern
            .replace('{product}', product)
            .replace('{use_case}', useCase);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }

    // Case 3: {product} + {brand}
    else if (pattern.includes('{product}') && pattern.includes('{brand}')) {
      for (const product of data.products) {
        for (const brand of data.brands) {
          const query = pattern
            .replace('{product}', product)
            .replace('{brand}', brand);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }

    // Case 4: {product} + {competitor}
    else if (pattern.includes('{product}') && pattern.includes('{competitor}')) {
      for (const product of data.products) {
        for (const comp of data.competitors) {
          const query = pattern
            .replace('{product}', product)
            .replace('{competitor}', comp);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }

    // Case 5: {product} + {problem}
    else if (pattern.includes('{product}') && pattern.includes('{problem}')) {
      for (const product of data.products) {
        for (const prob of data.problems) {
          const query = pattern
            .replace('{product}', product)
            .replace('{problem}', prob);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }

    // Case 6: {product} + {year}
    else if (pattern.includes('{product}') && pattern.includes('{year}')) {
      for (const product of data.products) {
        for (const year of years) {
          const query = pattern
            .replace('{product}', product)
            .replace('{year}', year);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }

    // Case 7: {brand} vs {competitor}
    else if (pattern.includes('{brand}') && pattern.includes('{competitor}')) {
      for (const brand of data.brands) {
        for (const comp of data.competitors) {
          if (brand === comp) continue; // Skip same brand
          const query = pattern
            .replace('{brand}', brand)
            .replace('{competitor}', comp);
          const key = normalize(query);
          if (!results.has(key)) {
            results.set(key, {
              query,
              intent: template.intent,
              category: template.category,
              language: 'en',
            });
          }
        }
      }
    }
  }

  // Add extra variations with random combinations to reach ~100k
  const additionalPatterns = [
    "best {product}",
    "top {product}",
    "{product} review",
    "{product} for beginners",
    "best {product} for marathon",
    "best {product} for long distance",
    "women's {product}",
    "men's {product}",
  ];

  let attempts = 0;
  const maxAttempts = 50000;

  while (results.size < 100000 && attempts < maxAttempts) {
    attempts++;
    const pattern = random(additionalPatterns);
    const product = random(data.products);
    const useCase = random(data.use_cases);
    const brand = random(data.brands);
    const comp = random(data.competitors);

    let query = pattern.replace('{product}', product);

    if (query.includes('{use_case}')) {
      query = query.replace('{use_case}', useCase);
    }

    const key = normalize(query);
    if (!results.has(key)) {
      results.set(key, {
        query,
        intent: 'commercial',
        category: 'generated',
        language: 'en',
      });
    }
  }

  return Array.from(results.values());
}

/**
 * Get statistics about generated prompts
 */
export function getStats(prompts: GeneratedPrompt[]): void {
  const byIntent: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const p of prompts) {
    byIntent[p.intent] = (byIntent[p.intent] || 0) + 1;
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  console.log(`\n=== Prompt Dataset Statistics ===`);
  console.log(`Total prompts: ${prompts.length}`);
  console.log(`\nBy Intent:`);
  for (const [intent, count] of Object.entries(byIntent)) {
    console.log(`  ${intent}: ${count}`);
  }
  console.log(`\nBy Category:`);
  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`  ${category}: ${count}`);
  }
}

/**
 * CLI entry point
 */
async function main() {
  console.log('Generating prompts...');

  // Get projectId from command line or use default
  const projectId = process.argv[2] || 'default-project-id';

  const prompts = generatePrompts(projectId);

  getStats(prompts);

  // Save to file
  const outputPath = path.join(__dirname, '..', 'data', 'generated-prompts.json');
  fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2));
  console.log(`\nSaved to: ${outputPath}`);

  console.log(`\nTotal: ${prompts.length} prompts generated`);
}

main().catch(console.error);
