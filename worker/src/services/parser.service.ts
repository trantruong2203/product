import { normalizeText, detectBrandMentions, detectPosition } from '../utils/parser.js';
import { prisma } from '../config/database.js';

export interface ParseResponseData {
  responseId: string;
  responseText: string;
  brandName: string;
  domain: string;
  competitorNames: string[];
  competitorDomains: string[];
}

export async function parseResponse(data: ParseResponseData): Promise<void> {
  const { responseId, responseText, brandName, domain, competitorNames, competitorDomains } = data;

  console.log(`Parsing response ${responseId} for brand ${brandName}`);

  const normalizedText = normalizeText(responseText);

  const allBrands = [
    { name: brandName, domain, isMain: true },
    ...competitorNames.map((name, idx) => ({
      name,
      domain: competitorDomains[idx] || '',
      isMain: false,
    })),
  ];

  for (const brand of allBrands) {
    const mentions = detectBrandMentions(normalizedText, brand.name, brand.domain);
    for (const mention of mentions) {
      await prisma.citation.create({
        data: {
          responseId,
          brand: brand.name,
          domain: brand.domain,
          position: mention.position,
          confidence: mention.confidence,
          context: mention.context,
        },
      });
    }
  }

  console.log(`Parsed ${allBrands.length} brands for response ${responseId}`);
}
