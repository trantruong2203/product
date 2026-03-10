/**
 * markdownConverter.ts
 *
 * Converts raw HTML from AI Search engines → clean Markdown
 * that Junior AI can read accurately.
 *
 * KEY GUARANTEE: Perplexity-style citations [1][2][3] are PRESERVED.
 * The old normalizeText() was stripping them — this file fixes that.
 *
 * Strategy: Pre-process HTML to replace <sup> / citation elements with
 * plain [N] text BEFORE handing off to NodeHtmlMarkdown. This avoids
 * fighting with the library's internal transformer API.
 */
import { NodeHtmlMarkdown } from "node-html-markdown";

const nhm = new NodeHtmlMarkdown({
  keepDataImages: false,
  useInlineLinks: true,
  useLinkReferenceDefinitions: false,
});

/**
 * Pre-process raw engine HTML before conversion.
 * Replaces Perplexity's various citation markup patterns with plain [N].
 */
function preprocessHtml(html: string): string {
  return (
    html
      // Pattern 1: <a href="..." data-citation="3"><sup>3</sup></a>
      // or <a ...><sup>[3]</sup></a>
      .replace(/<a[^>]+data-citation="(\d+)"[^>]*>[\s\S]*?<\/a>/gi, "[$1]")
      // Pattern 2: linked citation <a href="..."><sup>3</sup></a>
      .replace(/<a[^>]*>\s*<sup[^>]*>\[?(\d+)\]?<\/sup>\s*<\/a>/gi, "[$1]")
      // Pattern 3: bare <sup>[1]</sup> or <sup>1</sup>
      .replace(/<sup[^>]*>\[?(\d+)\]?<\/sup>/gi, "[$1]")
      // Pattern 4: Perplexity button citation
      .replace(
        /<button[^>]+data-citation-index="(\d+)"[^>]*>[\s\S]*?<\/button>/gi,
        "[$1]",
      )
      // Remove Sources toggle UI buttons (noise, not content)
      .replace(
        /<button[^>]*class="[^"]*(?:source|citation-toggle)[^"]*"[^>]*>[\s\S]*?<\/button>/gi,
        "",
      )
  );
}

/**
 * Convert engine HTML response → clean Markdown string.
 *
 * @param html - Raw innerHTML from the AI engine's response container
 * @param engineName - Used for engine-specific post-processing
 * @returns Clean Markdown with citations preserved as [1][2][3]
 */
export function htmlToMarkdown(html: string, engineName = ""): string {
  if (!html || html.trim() === "") return "";

  const preprocessed = preprocessHtml(html);
  let markdown = nhm.translate(preprocessed);

  // node-html-markdown escapes brackets: \[1\] → we need to restore [1]
  // Only unescape sequences that look like citation numbers: \[digit(s)\]
  markdown = markdown.replace(/\\\[(\d+)\\\]/g, "[$1]");

  return cleanMarkdown(markdown, engineName);
}

/**
 * Post-process Markdown output.
 *
 * IMPORTANT: This is intentionally LESS aggressive than normalizeText().
 * normalizeText() strips [brackets] and special chars — use it ONLY for
 * brand-matching comparison, NOT for saving output to DB.
 */
export function cleanMarkdown(md: string, engineName = ""): string {
  let result = md
    // Max 2 blank lines in a row
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing whitespace per line
    .replace(/[ \t]+$/gm, "")
    // Normalize citation spacing: "word[1]" → "word [1]"
    .replace(/(\w)\[(\d+)\]/g, "$1 [$2]")
    // Remove "Copy code" button text artifacts (ChatGPT)
    .replace(/^Copy code\s*$/gm, "")
    .trim();

  // Engine-specific cleanup
  if (engineName.toLowerCase().includes("gemini")) {
    result = result
      // Remove Gemini's "1 / 3 drafts" style navigation text
      .replace(/^\d+\s*\/\s*\d+\s*$/gm, "")
      // Remove "Thumbs up / Thumbs down" UI noise
      .replace(
        /^(Thumbs up|Thumbs down|Share|More|Edit|Like|Dislike)\s*$/gm,
        "",
      );
  }

  return result;
}
