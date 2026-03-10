/**
 * Prompt Generator Service (Backend)
 *
 * Generates exactly 10 high-quality, slot-based GEO prompts when a project is created.
 * Each slot targets a distinct intent to maximize signal diversity per run.
 *
 * Slot distribution:
 *  1  – Brand authority
 *  2  – Brand + primary keyword (commercial)
 *  3  – Brand review
 *  4  – Competitor comparison #1
 *  5  – Competitor comparison #2
 *  6  – Buying guide (informational)
 *  7  – Problem-solving
 *  8  – Use-case specific
 *  9  – Best-in-category (no brand – organic visibility)
 *  10 – Purchase intent (long-tail)
 */

export interface GeneratedPrompt {
  slot: number;
  query: string;
  intent:
    | "brand"
    | "commercial"
    | "informational"
    | "comparison"
    | "problem-solving";
  category: string;
  language: string;
}

export interface PromptGeneratorOptions {
  brandName: string;
  domain: string;
  keywords: string[];
  /** Top competitors (first two used for comparison slots). */
  competitors?: string[];
  language?: "en" | "vi";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback values when no project-specific data is provided
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_KEYWORDS = ["product", "service", "solution"];
const FALLBACK_USECASE = "everyday use";
const FALLBACK_PROBLEM = "common issues";
const FALLBACK_COMPETITORS = ["Competitor A", "Competitor B", "Competitor C"];

// ─────────────────────────────────────────────────────────────────────────────
// Slot templates (en + vi)
// ─────────────────────────────────────────────────────────────────────────────

interface SlotTemplate {
  en: string;
  vi: string;
  intent: GeneratedPrompt["intent"];
  category: string;
}

const SLOT_TEMPLATES: SlotTemplate[] = [
  // 1 – Brand authority
  {
    en: "Is {brand} a good brand?",
    vi: "{brand} có phải thương hiệu tốt không?",
    intent: "brand",
    category: "brand-authority",
  },
  // 2 – Brand + primary keyword
  {
    en: "Best {brand} {keyword}",
    vi: "{keyword} tốt nhất của {brand}",
    intent: "commercial",
    category: "brand-product",
  },
  // 3 – Brand review
  {
    en: "{brand} {keyword} review",
    vi: "Đánh giá {keyword} {brand}",
    intent: "informational",
    category: "brand-review",
  },
  // 4 – Competitor comparison #1
  {
    en: "{brand} vs {competitor1} – which is better?",
    vi: "{brand} hay {competitor1} tốt hơn?",
    intent: "comparison",
    category: "comparison",
  },
  // 5 – Competitor comparison #2
  {
    en: "{brand} compared to {competitor2}",
    vi: "So sánh {brand} và {competitor2}",
    intent: "comparison",
    category: "comparison",
  },
  // 6 – Buying guide
  {
    en: "How to choose the best {keyword}",
    vi: "Cách chọn {keyword} tốt nhất",
    intent: "informational",
    category: "buying-guide",
  },
  // 7 – Problem-solving
  {
    en: "Best {keyword} for {problem}",
    vi: "{keyword} tốt nhất cho người bị {problem}",
    intent: "problem-solving",
    category: "problem-solving",
  },
  // 8 – Use-case specific
  {
    en: "Best {keyword} for {usecase}",
    vi: "{keyword} tốt nhất cho {usecase}",
    intent: "commercial",
    category: "use-case",
  },
  // 9 – Best in category (measures organic AI visibility without brand bias)
  {
    en: "Top {keyword} brands in {currentYear}",
    vi: "Các thương hiệu {keyword} tốt nhất năm {currentYear}",
    intent: "informational",
    category: "category-ranking",
  },
  // 10 – Purchase intent
  {
    en: "Where to buy {brand} {keyword} online",
    vi: "Mua {keyword} {brand} chính hãng ở đâu?",
    intent: "commercial",
    category: "purchase-intent",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate exactly 10 focused GEO prompts for a project.
 */
export function generateProjectPrompts(
  options: PromptGeneratorOptions,
): GeneratedPrompt[] {
  const { brandName, keywords, competitors = [], language = "en" } = options;

  const primaryKeyword = keywords[0] ?? FALLBACK_KEYWORDS[0];
  const usecase = keywords[1] ?? FALLBACK_USECASE;
  const problem = keywords[2] ?? FALLBACK_PROBLEM;

  // Exclude own brand from competitor list
  const filteredCompetitors = competitors.filter(
    (c) => c.toLowerCase() !== brandName.toLowerCase(),
  );
  const competitor1 = filteredCompetitors[0] ?? FALLBACK_COMPETITORS[0];
  const competitor2 = filteredCompetitors[1] ?? FALLBACK_COMPETITORS[1];
  const currentYear = new Date().getFullYear().toString();

  const vars: Record<string, string> = {
    brand: brandName,
    keyword: primaryKeyword,
    usecase,
    problem,
    competitor1,
    competitor2,
    currentYear,
  };

  return SLOT_TEMPLATES.map((tpl, index) => ({
    slot: index + 1,
    query: fillTemplate(language === "vi" ? tpl.vi : tpl.en, vars),
    intent: tpl.intent,
    category: tpl.category,
    language,
  }));
}

/**
 * Returns prompt stats for debugging / display.
 */
export function getPromptStats(generatedPrompts: GeneratedPrompt[]): {
  total: number;
  byIntent: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const byIntent: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const p of generatedPrompts) {
    byIntent[p.intent] = (byIntent[p.intent] ?? 0) + 1;
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }

  return { total: generatedPrompts.length, byIntent, byCategory };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
