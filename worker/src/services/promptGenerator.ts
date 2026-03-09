/**
 * Project-specific prompt generator
 * Generates 100 SEO prompts tailored to each project's domain, brandName, and keywords
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

export interface ProjectPromptOptions {
  domain: string;
  brandName: string;
  keywords: string[];
  language?: string;
}

/**
 * Load default seed data for fallbacks
 */
function loadSeedData() {
  const dataDir = path.join(__dirname, '..', 'data', 'seeds');

  const products = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')
  ).products;

  const useCasesData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'useCases.json'), 'utf-8')
  );

  const brandsData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'brands.json'), 'utf-8')
  );

  return {
    products,
    use_cases: useCasesData.use_cases,
    problems: useCasesData.problems,
    competitors: brandsData.competitors,
  };
}

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
 * Generate 100 SEO prompts for a specific project
 * Distribution:
 * - 30 prompts: brandName + products (commercial)
 * - 30 prompts: keywords + use_cases (commercial)
 * - 20 prompts: comparison (brandName vs competitors)
 * - 20 prompts: informational/review
 */
export function generateProjectPrompts(options: ProjectPromptOptions): GeneratedPrompt[] {
  const { domain, brandName, keywords, language = 'en' } = options;
  const results: GeneratedPrompt[] = [];
  const seen = new Set<string>();

  const data = loadSeedData();

  // Use provided keywords or fallbacks
  const effectiveKeywords = keywords.length > 0 ? keywords : data.products;
  const effectiveUseCases = data.use_cases;
  const effectiveProducts = data.products;
  const effectiveCompetitors = data.competitors;

  // Helper: add prompt if not duplicate
  function addPrompt(query: string, intent: GeneratedPrompt['intent'], category: string) {
    const key = normalize(query);
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        query,
        intent,
        category,
        language,
      });
      return true;
    }
    return false;
  }

  // ============================================
  // Part 1: 30 prompts - brandName + products (commercial)
  // ============================================
  const brandProductTemplates = [
    `best {brand} {product}`,
    `{brand} {product} review`,
    `top rated {brand} {product}`,
    `buy {brand} {product} online`,
    `{brand} {product} for beginners`,
    `best {brand} {product} 2024`,
    `{brand} {product} price`,
    `{brand} {product} discount`,
    `{brand} {product} sale`,
    `authentic {brand} {product}`,
    `{brand} {product} official store`,
    `best selling {brand} {product}`,
    `{brand} {product} for running`,
    `{brand} {product} for training`,
    `premium {brand} {product}`,
  ];

  let brandPromptCount = 0;
  for (const template of brandProductTemplates) {
    if (brandPromptCount >= 30) break;
    for (const product of effectiveProducts) {
      if (brandPromptCount >= 30) break;
      const query = template.replace('{brand}', brandName).replace('{product}', product);
      if (addPrompt(query, 'commercial', 'brand-product')) {
        brandPromptCount++;
      }
    }
  }

  // ============================================
  // Part 2: 30 prompts - keywords + use_cases (commercial)
  // ============================================
  const keywordUseCaseTemplates = [
    `best {keyword} for {usecase}`,
    `{keyword} for {usecase}`,
    `top {keyword} for {usecase}`,
    `{keyword} {usecase} review`,
    `buy {keyword} for {usecase}`,
    `{keyword} for beginners {usecase}`,
    `best {keyword} 2024 for {usecase}`,
    `{keyword} price for {usecase}`,
  ];

  let keywordPromptCount = 0;
  for (const template of keywordUseCaseTemplates) {
    if (keywordPromptCount >= 30) break;
    for (const keyword of effectiveKeywords.slice(0, 10)) {
      if (keywordPromptCount >= 30) break;
      for (const usecase of effectiveUseCases.slice(0, 5)) {
        if (keywordPromptCount >= 30) break;
        const query = template.replace('{keyword}', keyword).replace('{usecase}', usecase);
        if (addPrompt(query, 'commercial', 'keyword-usecase')) {
          keywordPromptCount++;
        }
      }
    }
  }

  // ============================================
  // Part 3: 20 prompts - comparison (brandName vs competitors)
  // ============================================
  const comparisonTemplates = [
    `{brand} vs {competitor}`,
    `{brand} or {competitor} which is better`,
    `{brand} compared to {competitor}`,
    `{brand} vs {competitor} review`,
    `{brand} or {competitor} for running`,
    `{brand} vs {competitor} price`,
    `{brand} {competitor} difference`,
    `{brand} {competitor} comparison`,
  ];

  let comparisonCount = 0;
  for (const template of comparisonTemplates) {
    if (comparisonCount >= 20) break;
    for (const competitor of effectiveCompetitors) {
      if (comparisonCount >= 20) break;
      const query = template.replace('{brand}', brandName).replace('{competitor}', competitor);
      if (addPrompt(query, 'comparison', 'comparison')) {
        comparisonCount++;
      }
    }
  }

  // ============================================
  // Part 4: 20 prompts - informational/review
  // ============================================
  const informationalTemplates = [
    `how to choose {keyword}`,
    `{keyword} buying guide`,
    `{keyword} features`,
    `what is the best {keyword}`,
    `{keyword} pros and cons`,
    `{keyword} specifications`,
    `{keyword} vs similar products`,
    `{keyword} customer review`,
    `{keyword} rating`,
    `{keyword} best price`,
  ];

  let infoCount = 0;
  for (const template of informationalTemplates) {
    if (infoCount >= 20) break;
    for (const keyword of effectiveKeywords.slice(0, 10)) {
      if (infoCount >= 20) break;
      const query = template.replace('{keyword}', keyword);
      if (addPrompt(query, 'informational', 'informational')) {
        infoCount++;
      }
    }
  }

  // If we don't have 100 prompts yet, add more generic prompts
  const additionalTemplates = [
    `best {product}`,
    `{product} review`,
    `top {product}`,
    `{product} for women`,
    `{product} for men`,
    `{product} size guide`,
    `{product} warranty`,
    `{product} return policy`,
  ];

  let additionalCount = 0;
  while (results.length < 100) {
    const template = additionalTemplates[additionalCount % additionalTemplates.length];
    const product = effectiveProducts[additionalCount % effectiveProducts.length];
    const query = template.replace('{product}', product);
    if (addPrompt(query, 'commercial', 'additional')) {
      // Only increment if actually added (not duplicate)
    }
    additionalCount++;
    if (additionalCount > 500) break; // Safety limit
  }

  // Trim to exactly 100 prompts
  return results.slice(0, 100);
}

/**
 * Generate prompts and return just the query strings
 */
export function generateProjectPromptQueries(options: ProjectPromptOptions): string[] {
  return generateProjectPrompts(options).map(p => p.query);
}

export default generateProjectPrompts;
