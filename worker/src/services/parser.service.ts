import { detectBrandMentions, type Mention } from "../utils/parser.js";
import db, { citations } from "../config/database.js";
import { eq } from "drizzle-orm";

interface MentionedBrandContext {
  name: string;
  domain: string;
  isMain: boolean;
}

interface LinkMetadata {
  url: string | null;
  hostname: string | null;
  path: string | null;
  linkedBrandName: string | null;
  linkedBrandType: SourceType | null;
  sourceType: SourceType | null;
}
type SourceType = "OWN" | "COMPETITOR" | "THIRD_PARTY";

export interface ParseResponseData {
  responseId: string;
  responseText: string;
  brandName: string;
  domain: string;
  competitorNames: string[];
  competitorDomains: string[];
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/^www\./, "");
}

function parseHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

function firstUrlInText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)\]]+/i);
  return match ? match[0] : null;
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  const unique = new Set(matches.map((u) => u.replace(/[.,;!?]+$/, "")));
  return [...unique];
}

function detectSourceType(
  hostname: string | null,
  ownDomain: string,
  competitorDomains: string[],
): SourceType | null {
  if (!hostname) return null;
  const own = normalizeHostname(ownDomain);
  if (hostname.includes(own) || own.includes(hostname)) return "OWN";

  const isCompetitor = competitorDomains
    .filter(Boolean)
    .map(normalizeHostname)
    .some((d) => hostname.includes(d) || d.includes(hostname));

  if (isCompetitor) return "COMPETITOR";
  return "THIRD_PARTY";
}

function resolveBrandForUrl(
  hostname: string | null,
  brandName: string,
  ownDomain: string,
  competitorNames: string[],
  competitorDomains: string[],
): string | null {
  if (!hostname) return null;
  const own = normalizeHostname(ownDomain);
  if (hostname.includes(own) || own.includes(hostname)) return brandName;

  const competitorIndex = competitorDomains
    .map((d) => normalizeHostname(d || ""))
    .findIndex((d) => d && (hostname.includes(d) || d.includes(hostname)));

  if (competitorIndex >= 0) {
    return competitorNames[competitorIndex] || hostname;
  }

  return hostname;
}

export async function parseResponse(data: ParseResponseData): Promise<void> {
  const {
    responseId,
    responseText,
    brandName,
    domain,
    competitorNames,
    competitorDomains,
  } = data;

  console.log(`Parsing response ${responseId} for brand ${brandName}`);

  const allBrands: MentionedBrandContext[] = [
    { name: brandName, domain, isMain: true },
    ...competitorNames.map((name, idx) => ({
      name,
      domain: competitorDomains[idx] || "",
      isMain: false,
    })),
  ];

  const mentionRows = buildMentionCitations(
    responseId,
    responseText,
    domain,
    allBrands,
    competitorNames,
    competitorDomains,
  );

  const orphanLinkRowsPromise = buildOrphanLinkCitations(
    responseId,
    responseText,
    brandName,
    domain,
    competitorNames,
    competitorDomains,
  );

  const orphanLinkRows = await orphanLinkRowsPromise;
  const allRows = mentionRows.concat(orphanLinkRows);

  for (const row of allRows) {
    await db.insert(citations).values(row);
  }

  console.log(
    `Parsed response ${responseId}: ${mentionRows.length} mention rows, ${orphanLinkRows.length} orphan links`,
  );

  // Validate HTTP status for all citation URLs
  await validateCitationLinks(responseId);
}

function buildMentionCitations(
  responseId: string,
  responseText: string,
  ownDomain: string,
  brands: MentionedBrandContext[],
  competitorNames: string[],
  competitorDomains: string[],
) {
  const rows: Array<typeof citations.$inferInsert> = [];

  for (const brand of brands) {
    const mentions: Mention[] = detectBrandMentions(responseText, brand.name, brand.domain);

    for (const mention of mentions) {
      const mentionedBrandName = brand.name;
      const mentionedBrandIsPrimary = brand.isMain;
      const context = mention.context ? mention.context.substring(0, 500) : null;
      const firstUrl = firstUrlInText(context || "");
      const linkMeta = resolveLinkMetadata(
        firstUrl,
        ownDomain,
        competitorNames,
        competitorDomains,
        brand.name,
      );

      rows.push({
        responseId,
        brand: linkMeta.linkedBrandName ?? mentionedBrandName,
        domain: linkMeta.hostname ?? (brand.domain || null),
        url: linkMeta.url,
        hostname: linkMeta.hostname,
        path: linkMeta.path,
        sourceType: linkMeta.sourceType,
        mentionedBrand: true,
        mentionedBrandName,
        mentionedBrandIsPrimary,
        linkedBrandName: linkMeta.linkedBrandName,
        linkedBrandType: linkMeta.linkedBrandType,
        position: mention.position,
        confidence: mention.confidence,
        context,
      });
    }
  }

  return rows;
}

async function buildOrphanLinkCitations(
  responseId: string,
  responseText: string,
  brandName: string,
  ownDomain: string,
  competitorNames: string[],
  competitorDomains: string[],
) {
  const urls = extractUrls(responseText);
  const rows: Array<typeof citations.$inferInsert> = [];

  for (const url of urls) {
    const meta = resolveLinkMetadata(url, ownDomain, competitorNames, competitorDomains, brandName);

    if (!meta.url) continue;

    rows.push({
      responseId,
      brand: meta.linkedBrandName ?? brandName,
      domain: meta.hostname,
      url: meta.url,
      hostname: meta.hostname,
      path: meta.path,
      sourceType: meta.sourceType,
      linkedBrandName: meta.linkedBrandName,
      linkedBrandType: meta.linkedBrandType,
      mentionedBrand: false,
      // FIX #9: Orphan links (no explicit mention) should have lower confidence
      // than explicit mentions. Use 0.6 instead of 1.0
      confidence: 0.6,
      context: null,
    });
  }

  return rows;
}

function resolveLinkMetadata(
  url: string | null,
  ownDomain: string,
  competitorNames: string[],
  competitorDomains: string[],
  fallbackBrandName: string,
): LinkMetadata {
  const hostname = parseHostname(url);
  const path = (() => {
    if (!url) return null;
    try {
      return new URL(url).pathname;
    } catch {
      return null;
    }
  })();

  const linkedBrandType = detectSourceType(hostname, ownDomain, competitorDomains);
  const linkedBrandName = resolveBrandForUrl(
    hostname,
    fallbackBrandName,
    ownDomain,
    competitorNames,
    competitorDomains,
  );

  const sourceType = linkedBrandType ?? detectSourceType(hostname, ownDomain, competitorDomains);

  return {
    url,
    hostname,
    path,
    linkedBrandName,
    linkedBrandType,
    sourceType,
  };
}


/**
 * Perform HTTP HEAD check for all citations of a given response
 * and update isValid + httpStatus in the database.
 * Uses Promise.allSettled() to ensure one bad link doesn't fail the entire batch.
 */
async function validateCitationLinks(responseId: string): Promise<void> {
  const rows = await db
    .select({ id: citations.id, url: citations.url })
    .from(citations)
    .where(eq(citations.responseId, responseId));

  const urlRows = rows.filter((r) => r.url);

  const results = await Promise.allSettled(
    urlRows.map(async (row) => {
      let httpStatus: number | null = null;
      let isValid = false;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(row.url!, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timer);
        httpStatus = res.status;
        isValid = res.status >= 200 && res.status < 400;
      } catch (error) {
        // timeout or network error — leave isValid=false, httpStatus=null
        console.debug(`Link validation failed for ${row.url}:`, error instanceof Error ? error.message : 'Unknown error');
      }

      await db
        .update(citations)
        .set({ isValid, httpStatus })
        .where(eq(citations.id, row.id));

      return { url: row.url, isValid, httpStatus };
    }),
  );

  // Log validation summary
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `Validated links for response ${responseId}: ${successful} succeeded, ${failed} failed out of ${urlRows.length} URLs`,
  );
}
