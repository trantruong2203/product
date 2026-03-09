/**
 * Prompt Generator Service
 * Generates 100 SEO prompts based on project domain, brandName, and custom keywords
 */

export interface GeneratedPrompt {
  query: string;
  intent: 'commercial' | 'informational' | 'comparison' | 'problem-solving';
  category: string;
  language: string;
}

export interface PromptGeneratorOptions {
  brandName: string;
  domain: string;
  keywords: string[];
  country?: string;
}

// Default use cases and problems
const defaultUseCases = [
  'marathon', 'beginners', 'long distance', 'trail running', 'sprint',
  'weightlifting', 'cross training', 'daily commute', 'casual wear', 'recovery',
  'flat feet', 'overpronation', 'underpronation', 'neutral'
];

const defaultProblems = [
  'plantar fasciitis', 'shin splints', 'runner knee', 'achilles tendonitis',
  'blisters', 'arch pain', 'heel pain', 'knee pain', 'ankle support'
];

const defaultCompetitors = [
  'nike', 'adidas', 'puma', 'new balance', 'under armour',
  'asics', 'reebok', 'brooks', 'hoka', 'salomon'
];

// Templates for prompt generation
const templates = [
  { pattern: "best {product}", intent: 'commercial' as const, category: 'general' },
  { pattern: "best {product} 2025", intent: 'commercial' as const, category: 'general' },
  { pattern: "best {product} 2026", intent: 'commercial' as const, category: 'general' },
  { pattern: "top {product}", intent: 'commercial' as const, category: 'general' },
  { pattern: "top rated {product}", intent: 'commercial' as const, category: 'general' },
  { pattern: "most popular {product}", intent: 'commercial' as const, category: 'general' },
  { pattern: "best {product} for {use_case}", intent: 'commercial' as const, category: 'use_case' },
  { pattern: "best {product} for {problem}", intent: 'problem-solving' as const, category: 'problem' },
  { pattern: "top {product} for {use_case}", intent: 'commercial' as const, category: 'use_case' },
  { pattern: "{product} for {use_case}", intent: 'commercial' as const, category: 'use_case' },
  { pattern: "{product} for beginners", intent: 'commercial' as const, category: 'beginners' },
  { pattern: "best {product} for beginners", intent: 'commercial' as const, category: 'beginners' },
  { pattern: "best {brand} {product}", intent: 'commercial' as const, category: 'brand' },
  { pattern: "top {brand} {product}", intent: 'commercial' as const, category: 'brand' },
  { pattern: "{brand} {product} review", intent: 'informational' as const, category: 'review' },
  { pattern: "is {brand} {product} good", intent: 'informational' as const, category: 'review' },
  { pattern: "{brand} vs {competitor} {product}", intent: 'comparison' as const, category: 'comparison' },
  { pattern: "{brand} or {competitor} {product}", intent: 'comparison' as const, category: 'comparison' },
  { pattern: "which is better {brand} or {competitor}", intent: 'comparison' as const, category: 'comparison' },
  { pattern: "top 10 {product}", intent: 'commercial' as const, category: 'top_list' },
  { pattern: "top 10 {product} for {use_case}", intent: 'commercial' as const, category: 'top_list' },
  { pattern: "best {product} ranked", intent: 'commercial' as const, category: 'ranking' },
  { pattern: "{product} review", intent: 'informational' as const, category: 'review' },
  { pattern: "{product} comparison", intent: 'informational' as const, category: 'comparison' },
  { pattern: "{product} buying guide", intent: 'informational' as const, category: 'guide' },
  { pattern: "how to choose {product}", intent: 'informational' as const, category: 'guide' },
  { pattern: "affordable {product}", intent: 'commercial' as const, category: 'price' },
  { pattern: "budget {product}", intent: 'commercial' as const, category: 'price' },
  { pattern: "cheap {product}", intent: 'commercial' as const, category: 'price' },
  { pattern: "premium {product}", intent: 'commercial' as const, category: 'price' },
  { pattern: "luxury {product}", intent: 'commercial' as const, category: 'price' },
  { pattern: "{product} for marathon training", intent: 'commercial' as const, category: 'use_case' },
  { pattern: "{product} for long distance running", intent: 'commercial' as const, category: 'use_case' },
  { pattern: "women's {product}", intent: 'commercial' as const, category: 'demographic' },
  { pattern: "men's {product}", intent: 'commercial' as const, category: 'demographic' },
  { pattern: "kids {product}", intent: 'commercial' as const, category: 'demographic' },
  { pattern: "best {product} near me", intent: 'commercial' as const, category: 'local' },
  { pattern: "where to buy {product}", intent: 'commercial' as const, category: 'shopping' },
];

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
 * Get current year for templates
 */
function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

/**
 * Random item from array
 */
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate 100 SEO prompts based on project settings
 */
export function generateProjectPrompts(options: PromptGeneratorOptions): GeneratedPrompt[] {
  const { brandName, domain, keywords, country = 'US' } = options;

  const results: Map<string, GeneratedPrompt> = new Map();
  const brandLower = normalize(brandName);

  // Extract product category from domain
  const domainParts = domain.replace(/[^a-z0-9]/g, ' ').split(' ').filter(Boolean);
  const inferredProducts = inferProducts(domainParts, keywords);

  // Filter competitors (exclude own brand)
  const competitors = defaultCompetitors.filter(c => normalize(c) !== brandLower);

  // ===== Group 1: Brand + Products (30 prompts) =====
  const brandProductPatterns = [
    `best ${brandName}`,
    `best ${brandName} 2025`,
    `best ${brandName} 2026`,
    `top ${brandName}`,
    `top rated ${brandName}`,
    `${brandName} review`,
    `is ${brandName} good`,
    `best ${brandName} for marathon`,
    `best ${brandName} for long distance`,
    `best ${brandName} for beginners`,
    `${brandName} for running`,
    `${brandName} vs nike`,
    `${brandName} vs adidas`,
    `${brandName} comparison`,
    `${brandName} buying guide`,
    `affordable ${brandName}`,
    `premium ${brandName}`,
    `${brandName} price`,
    `${brandName} for women`,
    `${brandName} for men`,
    `${brandName} for kids`,
    `${brandName} sizing guide`,
    `${brandName} quality`,
    `where to buy ${brandName}`,
    `official ${brandName} store`,
    `${brandName} discount code`,
    `${brandName} sale`,
    `new ${brandName} release 2025`,
    `latest ${brandName} model`,
    `${brandName} technology`
  ];

  for (const pattern of brandProductPatterns) {
    const key = normalize(pattern);
    if (!results.has(key)) {
      results.set(key, {
        query: pattern,
        intent: 'commercial',
        category: 'brand_product',
        language: 'en',
      });
    }
  }

  // ===== Group 2: Keywords + Use Cases (30 prompts) =====
  const combinedTerms = [...keywords, ...inferredProducts].slice(0, 10);

  for (const term of combinedTerms) {
    for (const useCase of defaultUseCases.slice(0, 3)) {
      const patterns = [
        `best ${term} for ${useCase}`,
        `top ${term} for ${useCase}`,
      ];

      for (const pattern of patterns) {
        const key = normalize(pattern);
        if (!results.has(key) && results.size < 60) {
          results.set(key, {
            query: pattern,
            intent: 'commercial',
            category: 'keyword_use_case',
            language: 'en',
          });
        }
      }
    }
  }

  // ===== Group 3: Comparison (20 prompts) =====
  const comparisonPatterns = [
    `${brandName} vs {competitor}`,
    `${brandName} or {competitor}`,
    `which is better ${brandName} or {competitor}`,
    `{competitor} vs ${brandName}`,
  ];

  for (const pattern of comparisonPatterns) {
    for (const competitor of competitors.slice(0, 5)) {
      const query = pattern.replace('{competitor}', competitor);
      const key = normalize(query);
      if (!results.has(key) && results.size < 80) {
        results.set(key, {
          query,
          intent: 'comparison',
          category: 'comparison',
          language: 'en',
        });
      }
    }
  }

  // ===== Group 4: Informational/Review (20 prompts) =====
  const informationalPatterns = [
    '{product} review',
    '{product} comparison',
    '{product} buying guide',
    'how to choose {product}',
    '{product} pros and cons',
    'is {product} worth it',
    '{product} vs {competitor}',
    'best {product} ranked',
    'top 10 {product}',
    '{product} features',
  ];

  for (const pattern of informationalPatterns) {
    const product = random(combinedTerms.length > 0 ? combinedTerms : inferredProducts);
    const competitor = random(competitors);

    let query = pattern
      .replace('{product}', product)
      .replace('{competitor}', competitor);

    const key = normalize(query);
    if (!results.has(key) && results.size < 100) {
      results.set(key, {
        query,
        intent: pattern.includes('vs') ? 'comparison' : 'informational',
        category: 'informational',
        language: 'en',
      });
    }
  }

  // If still not enough, fill with template-based prompts
  if (results.size < 100) {
    for (const template of templates) {
      if (results.size >= 100) break;

      const product = random(inferredProducts);
      const useCase = random(defaultUseCases);
      const problem = random(defaultProblems);

      let query = template.pattern
        .replace(/{product}/g, product)
        .replace(/{use_case}/g, useCase)
        .replace(/{problem}/g, problem)
        .replace(/{brand}/g, brandName)
        .replace(/{competitor}/g, random(competitors))
        .replace(/{year}/g, getCurrentYear());

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

  // Convert to array and return exactly 100 (or available)
  const prompts = Array.from(results.values());

  // Shuffle to get variety
  for (let i = prompts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prompts[i], prompts[j]] = [prompts[j], prompts[i]];
  }

  return prompts.slice(0, 100);
}

/**
 * Infer products from domain and keywords
 */
function inferProducts(domainParts: string[], keywords: string[]): string[] {
  const products: string[] = [];

  const productKeywords = [
    'shoes', 'shoe', 'sneakers', 'running', 'training', 'sports',
    'jacket', 'shirt', 'pants', 'shorts', 'hoodie', 'cap', 'hat',
    'bag', 'backpack', 'watch', 'glasses', 'helmet', 'gloves'
  ];

  for (const part of domainParts) {
    if (productKeywords.includes(part.toLowerCase())) {
      products.push(part);
    }
  }

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (productKeywords.some(pk => kwLower.includes(pk))) {
      products.push(kw);
    } else if (kw.length > 2) {
      products.push(kw);
    }
  }

  if (products.length === 0) {
    products.push('running shoes', 'sports shoes', 'athletic wear');
  }

  return [...new Set(products)];
}

/**
 * Get statistics about generated prompts
 */
export function getPromptStats(prompts: GeneratedPrompt[]): {
  total: number;
  byIntent: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const byIntent: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const p of prompts) {
    byIntent[p.intent] = (byIntent[p.intent] || 0) + 1;
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  return {
    total: prompts.length,
    byIntent,
    byCategory,
  };
}
