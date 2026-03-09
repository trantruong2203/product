/**
 * Prompt templates for dataset generation
 * Placeholders: {product}, {brand}, {competitor}, {use_case}, {problem}, {year}
 */

export interface Template {
  pattern: string;
  intent: 'commercial' | 'informational' | 'comparison' | 'problem-solving';
  category: string;
}

export const templates: Template[] = [
  // Commercial intent - "best X"
  { pattern: "best {product}", intent: 'commercial', category: 'general' },
  { pattern: "best {product} 2025", intent: 'commercial', category: 'general' },
  { pattern: "best {product} 2026", intent: 'commercial', category: 'general' },
  { pattern: "top {product}", intent: 'commercial', category: 'general' },
  { pattern: "top rated {product}", intent: 'commercial', category: 'general' },
  { pattern: "most popular {product}", intent: 'commercial', category: 'general' },

  // Product + Use case
  { pattern: "best {product} for {use_case}", intent: 'commercial', category: 'use_case' },
  { pattern: "best {product} for {problem}", intent: 'problem-solving', category: 'problem' },
  { pattern: "top {product} for {use_case}", intent: 'commercial', category: 'use_case' },
  { pattern: "{product} for {use_case}", intent: 'commercial', category: 'use_case' },
  { pattern: "{product} for {problem}", intent: 'problem-solving', category: 'problem' },
  { pattern: "{product} for beginners", intent: 'commercial', category: 'beginners' },
  { pattern: "best {product} for beginners", intent: 'commercial', category: 'beginners' },

  // Brand-focused
  { pattern: "best {brand} {product}", intent: 'commercial', category: 'brand' },
  { pattern: "top {brand} {product}", intent: 'commercial', category: 'brand' },
  { pattern: "best {brand} {product} 2025", intent: 'commercial', category: 'brand' },
  { pattern: "{brand} {product} review", intent: 'informational', category: 'review' },
  { pattern: "is {brand} {product} good", intent: 'informational', category: 'review' },

  // Comparison
  { pattern: "{brand} vs {competitor} {product}", intent: 'comparison', category: 'comparison' },
  { pattern: "{brand} or {competitor} {product}", intent: 'comparison', category: 'comparison' },
  { pattern: "nike vs adidas {product}", intent: 'comparison', category: 'comparison' },
  { pattern: "which is better {brand} or {competitor}", intent: 'comparison', category: 'comparison' },
  { pattern: "{brand} vs {competitor} - which is better", intent: 'comparison', category: 'comparison' },

  // Top lists
  { pattern: "top 10 {product}", intent: 'commercial', category: 'top_list' },
  { pattern: "top 10 {product} for {use_case}", intent: 'commercial', category: 'top_list' },
  { pattern: "best {product} ranked", intent: 'commercial', category: 'ranking' },
  { pattern: "best {product} 2025 ranked", intent: 'commercial', category: 'ranking' },

  // Problem-solving
  { pattern: "best {product} for {problem}", intent: 'problem-solving', category: 'problem' },
  { pattern: "{product} for {problem} - help", intent: 'problem-solving', category: 'problem' },
  { pattern: "what {product} to buy for {problem}", intent: 'problem-solving', category: 'problem' },

  // Year-specific
  { pattern: "best {product} {year}", intent: 'commercial', category: 'year' },
  { pattern: "top {product} {year}", intent: 'commercial', category: 'year' },
  { pattern: "{product} {year} best", intent: 'commercial', category: 'year' },

  // General informational
  { pattern: "{product} review", intent: 'informational', category: 'review' },
  { pattern: "{product} comparison", intent: 'informational', category: 'comparison' },
  { pattern: "{product} buying guide", intent: 'informational', category: 'guide' },
  { pattern: "how to choose {product}", intent: 'informational', category: 'guide' },
  { pattern: "{product} guide", intent: 'informational', category: 'guide' },

  // Specific queries
  { pattern: "affordable {product}", intent: 'commercial', category: 'price' },
  { pattern: "budget {product}", intent: 'commercial', category: 'price' },
  { pattern: "cheap {product}", intent: 'commercial', category: 'price' },
  { pattern: "premium {product}", intent: 'commercial', category: 'price' },
  { pattern: "luxury {product}", intent: 'commercial', category: 'price' },
  { pattern: "expensive {product} worth it", intent: 'informational', category: 'price' },

  // Specific use cases
  { pattern: "{product} for marathon training", intent: 'commercial', category: 'use_case' },
  { pattern: "{product} for long distance running", intent: 'commercial', category: 'use_case' },
  { pattern: "women's {product}", intent: 'commercial', category: 'demographic' },
  { pattern: "men's {product}", intent: 'commercial', category: 'demographic' },
  { pattern: "kids {product}", intent: 'commercial', category: 'demographic' },

  // Local/modifier
  { pattern: "best {product} near me", intent: 'commercial', category: 'local' },
  { pattern: "{product} online shop", intent: 'commercial', category: 'shopping' },
  { pattern: "where to buy {product}", intent: 'commercial', category: 'shopping' },
];

export const years = ['2024', '2025', '2026'];

export const modifiers = [
  'best', 'top', 'good', 'great', 'excellent', 'popular',
  'affordable', 'cheap', 'expensive', 'premium', 'luxury',
  'new', 'latest', '2024', '2025', '2026'
];
