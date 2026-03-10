/**
 * High-quality GEO prompt generator
 *
 * Strategy: 10 focused prompts per run, covering the highest-signal intent categories.
 * Distribution (fixed slots, no bloat):
 *
 *  Slot 1   – Brand authority (direct brand query)
 *  Slot 2   – Brand + primary keyword (commercial)
 *  Slot 3   – Brand review / trustworthiness
 *  Slot 4   – Competitor comparison #1
 *  Slot 5   – Competitor comparison #2
 *  Slot 6   – Informational / buying guide
 *  Slot 7   – Problem-solving (pain point)
 *  Slot 8   – Use-case specific (category)
 *  Slot 9   – Best-in-category (generic, no brand)
 *  Slot 10  – Long-tail high-intent (price / where to buy)
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

export interface ProjectPromptOptions {
  domain: string;
  brandName: string;
  keywords: string[];
  /** Top competitors to compare against. First 2 are used for comparison slots. */
  competitors?: string[];
  language?: "en" | "vi";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback data (used when project has no keywords / competitors configured)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_KEYWORDS = ["shoes", "sneakers", "footwear"];

const FALLBACK_COMPETITORS = ["Nike", "Adidas", "Puma"];

const FALLBACK_USECASE = "everyday use";

const FALLBACK_PROBLEM = "foot pain";

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions per slot
// ─────────────────────────────────────────────────────────────────────────────

interface SlotTemplate {
  en: string;
  vi: string;
  intent: GeneratedPrompt["intent"];
  category: string;
}

const SLOT_TEMPLATES: SlotTemplate[] = [
  // Slot 1 – Brand authority
  {
    en: "Is {brand} a good brand?",
    vi: "{brand} có phải thương hiệu tốt không?",
    intent: "brand",
    category: "brand-authority",
  },

  // Slot 2 – Brand + primary keyword (commercial)
  {
    en: "Best {brand} {keyword}",
    vi: "{keyword} tốt nhất của {brand}",
    intent: "commercial",
    category: "brand-product",
  },

  // Slot 3 – Brand review
  {
    en: "{brand} {keyword} review",
    vi: "Đánh giá {keyword} {brand}",
    intent: "informational",
    category: "brand-review",
  },

  // Slot 4 – Competitor comparison #1
  {
    en: "{brand} vs {competitor1} – which is better?",
    vi: "{brand} hay {competitor1} tốt hơn?",
    intent: "comparison",
    category: "comparison",
  },

  // Slot 5 – Competitor comparison #2
  {
    en: "{brand} compared to {competitor2}",
    vi: "So sánh {brand} và {competitor2}",
    intent: "comparison",
    category: "comparison",
  },

  // Slot 6 – Informational / buying guide
  {
    en: "How to choose the best {keyword}",
    vi: "Cách chọn {keyword} tốt nhất",
    intent: "informational",
    category: "buying-guide",
  },

  // Slot 7 – Problem-solving
  {
    en: "Best {keyword} for {problem}",
    vi: "{keyword} tốt nhất cho người bị {problem}",
    intent: "problem-solving",
    category: "problem-solving",
  },

  // Slot 8 – Use-case specific
  {
    en: "Best {keyword} for {usecase}",
    vi: "{keyword} tốt nhất cho {usecase}",
    intent: "commercial",
    category: "use-case",
  },

  // Slot 9 – Best in category (no brand – measures organic visibility)
  {
    en: "Top {keyword} brands in {currentYear}",
    vi: "Các thương hiệu {keyword} tốt nhất năm {currentYear}",
    intent: "informational",
    category: "category-ranking",
  },

  // Slot 10 – Long-tail high-intent (purchase signal)
  {
    en: "Where to buy {brand} {keyword} online",
    vi: "Mua {keyword} {brand} chính hãng ở đâu?",
    intent: "commercial",
    category: "purchase-intent",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Core generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate exactly 10 high-quality, slot-based GEO prompts for a project.
 */
export function generateProjectPrompts(
  options: ProjectPromptOptions,
): GeneratedPrompt[] {
  const { brandName, keywords, competitors = [], language = "en" } = options;

  // Resolve effective values with fallbacks
  const primaryKeyword = keywords[0] ?? FALLBACK_KEYWORDS[0];
  const usecase = keywords[1] ?? FALLBACK_USECASE;
  const problem = keywords[2] ?? FALLBACK_PROBLEM;
  const competitor1 =
    competitors[0] ??
    FALLBACK_COMPETITORS.find(
      (c) => c.toLowerCase() !== brandName.toLowerCase(),
    ) ??
    FALLBACK_COMPETITORS[0];
  const competitor2 =
    competitors[1] ??
    FALLBACK_COMPETITORS.find(
      (c) => c.toLowerCase() !== brandName.toLowerCase() && c !== competitor1,
    ) ??
    FALLBACK_COMPETITORS[1];
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

  const results: GeneratedPrompt[] = SLOT_TEMPLATES.map((tpl, index) => {
    const template = language === "vi" ? tpl.vi : tpl.en;
    const query = fillTemplate(template, vars);

    return {
      slot: index + 1,
      query,
      intent: tpl.intent,
      category: tpl.category,
      language,
    };
  });

  return results;
}

/**
 * Return only the query strings (used by the job queue).
 */
export function generateProjectPromptQueries(
  options: ProjectPromptOptions,
): string[] {
  return generateProjectPrompts(options).map((p) => p.query);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export default generateProjectPrompts;
