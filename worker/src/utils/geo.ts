import type { Geolocation } from "playwright";

export interface GeoContextOptions {
  country?: string;   // ISO-3166-1 alpha-2 e.g. "VN"
  language?: string;  // e.g. "vi", "en"
  locale?: string;    // e.g. "vi-VN"
  timezoneId?: string; // IANA tz e.g. "Asia/Ho_Chi_Minh"
}

export interface ResolvedGeoContextOptions {
  locale: string;
  timezoneId?: string;
  geolocation?: Geolocation;
  acceptLanguageHeader: string;
}

const COUNTRY_PRESETS: Record<
  string,
  { locale: string; timezoneId?: string; geolocation?: Geolocation }
> = {
  US: {
    locale: "en-US",
    timezoneId: "America/New_York",
    geolocation: { latitude: 40.7128, longitude: -74.006, accuracy: 50 },
  },
  GB: {
    locale: "en-GB",
    timezoneId: "Europe/London",
    geolocation: { latitude: 51.5072, longitude: -0.1276, accuracy: 50 },
  },
  VN: {
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    geolocation: { latitude: 10.8231, longitude: 106.6297, accuracy: 50 },
  },
};

function normalizeCountry(country?: string): string | undefined {
  const c = country?.trim().toUpperCase();
  if (c === "UK") return "GB";
  return c && /^[A-Z]{2}$/.test(c) ? c : undefined;
}

function buildAcceptLanguage(language?: string, locale?: string): string {
  const lang = language?.trim().toLowerCase();
  const loc = locale?.trim();

  if (loc && loc.includes("-")) {
    const base = loc.split("-")[0].toLowerCase();
    if (base) {
      return `${loc},${base};q=0.9,en;q=0.8`;
    }
  }

  if (lang) {
    return `${lang};q=0.9,en;q=0.8`;
  }

  return "en-US,en;q=0.9";
}

export function resolveGeoContextOptions(
  opts?: GeoContextOptions
): ResolvedGeoContextOptions {
  const country = normalizeCountry(opts?.country);
  const preset = (country && COUNTRY_PRESETS[country]) || COUNTRY_PRESETS.US;

  const locale = opts?.locale || preset.locale;
  const timezoneId = opts?.timezoneId || preset.timezoneId;
  const geolocation = preset.geolocation;

  return {
    locale,
    timezoneId,
    geolocation,
    acceptLanguageHeader: buildAcceptLanguage(opts?.language, locale),
  };
}

