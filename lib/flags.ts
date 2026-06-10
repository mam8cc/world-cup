// Maps World Cup team names (as they appear in the OpenFootball feed) to ISO 3166-1
// alpha-2 codes, then derives the emoji flag. England/Scotland use subdivision flags.

const ISO2: Record<string, string> = {
  Algeria: "DZ",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  "Bosnia & Herzegovina": "BA",
  Brazil: "BR",
  Canada: "CA",
  "Cape Verde": "CV",
  Colombia: "CO",
  Croatia: "HR",
  "Curaçao": "CW",
  "Czech Republic": "CZ",
  "DR Congo": "CD",
  Ecuador: "EC",
  Egypt: "EG",
  France: "FR",
  Germany: "DE",
  Ghana: "GH",
  Haiti: "HT",
  Iran: "IR",
  Iraq: "IQ",
  "Ivory Coast": "CI",
  Japan: "JP",
  Jordan: "JO",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Norway: "NO",
  Panama: "PA",
  Paraguay: "PY",
  Portugal: "PT",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Tunisia: "TN",
  Turkey: "TR",
  USA: "US",
  Uruguay: "UY",
  Uzbekistan: "UZ",
};

// England and Scotland have their own flag emoji (GB subdivisions), not an ISO2 pair.
const SPECIAL: Record<string, string> = {
  England: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  Scotland: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
};

function emojiFromIso2(code: string): string {
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  return String.fromCodePoint(A + (code.charCodeAt(0) - base), A + (code.charCodeAt(1) - base));
}

// Flag emoji for a country, or "" if unknown (e.g. unresolved knockout placeholders).
export function flag(name: string): string {
  if (SPECIAL[name]) return SPECIAL[name];
  const iso = ISO2[name];
  return iso ? emojiFromIso2(iso) : "";
}

// "🇲🇽 Mexico" — flag prefixed when known, otherwise just the name.
export function withFlag(name: string): string {
  const f = flag(name);
  return f ? `${f} ${name}` : name;
}
