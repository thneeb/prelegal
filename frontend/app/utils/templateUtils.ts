import { NdaFormData } from "../types/nda";

// Read the raw template files (bundled at build time via public/ folder)
export async function loadTemplate(filename: string): Promise<string> {
  const res = await fetch(`/templates/${filename}`);
  if (!res.ok) throw new Error(`Failed to load template: ${filename}`);
  return res.text();
}

/** Sanitize a year string to a positive integer, preventing markdown injection. */
function sanitizeYears(val: string, fallback = "1"): string {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? String(n) : fallback;
}

function formatDate(iso: string): string {
  if (!iso) return "[Date]";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Build the filled cover page markdown from the template and form data.
 */
export function buildCoverPage(data: NdaFormData): string {
  const mndaTerm =
    data.mndaTermType === "years"
      ? `${sanitizeYears(data.mndaTermYears)} year(s) from Effective Date`
      : "Continues until terminated in accordance with the terms of the MNDA";

  const confidentialityTerm =
    data.confidentialityTermType === "years"
      ? `${sanitizeYears(data.confidentialityTermYears)} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws`
      : "In perpetuity";

  return `# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page ("**Cover Page**") and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("**Standard Terms**") identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose
*How Confidential Information may be used*

${data.purpose || "[Purpose not specified]"}

### Effective Date
${formatDate(data.effectiveDate)}

### MNDA Term
*The length of this MNDA*

${mndaTerm}

### Term of Confidentiality
*How long Confidential Information is protected*

${confidentialityTerm}

### Governing Law & Jurisdiction
**Governing Law:** ${data.governingLaw || "[State]"}

**Jurisdiction:** ${data.jurisdiction || "[City/County and State]"}

${data.modifications ? `### MNDA Modifications\n\n${data.modifications}\n\n` : ""}By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

---
`;
}

/**
 * Fill the standard terms template, replacing coverpage_link spans with actual values.
 */
export function fillStandardTerms(raw: string, data: NdaFormData): string {
  const mndaTerm =
    data.mndaTermType === "years"
      ? `${sanitizeYears(data.mndaTermYears)} year(s) from Effective Date`
      : "the date of termination";

  const confidentialityTerm =
    data.confidentialityTermType === "years"
      ? `${sanitizeYears(data.confidentialityTermYears)} year(s) from Effective Date`
      : "in perpetuity";

  const replacements: Record<string, string> = {
    Purpose: data.purpose || "[Purpose]",
    "Effective Date": formatDate(data.effectiveDate),
    "MNDA Term": mndaTerm,
    "Term of Confidentiality": confidentialityTerm,
    "Governing Law": data.governingLaw || "[Governing Law]",
    Jurisdiction: data.jurisdiction || "[Jurisdiction]",
  };

  let result = raw;

  // Replace <span class="coverpage_link">FieldName</span> with actual values
  // Use [\s\S]*? to handle multi-line spans and content containing special characters
  result = result.replace(
    /<span class="coverpage_link">([\s\S]+?)<\/span>/g,
    (_, field) => replacements[field.trim()] ?? field.trim()
  );

  // Remove other span tags but keep their text content
  result = result.replace(/<span[\s\S]*?>([\s\S]*?)<\/span>/g, "$1");
  result = result.replace(/<label>[\s\S]*?<\/label>/g, "");

  return result;
}

/**
 * Combine cover page + standard terms into a single markdown string.
 */
export function buildFullDocument(standardTermsRaw: string, data: NdaFormData): string {
  const coverPage = buildCoverPage(data);
  const standardTerms = fillStandardTerms(standardTermsRaw, data);
  // coverPage already ends with "---\n"; standardTerms already starts with "# Standard Terms"
  return coverPage + "\n" + standardTerms;
}
