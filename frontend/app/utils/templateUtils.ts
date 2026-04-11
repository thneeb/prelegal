import { NdaFormData } from "../types/nda";
import { DocumentConfig } from "../document_configs";

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

export function formatDate(iso: string): string {
  if (!iso) return "[Date]";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── MNDA-specific (existing behaviour preserved) ────────────────────────────

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

// ─── Generic document support ────────────────────────────────────────────────

export type GenericFormData = Record<string, string>;

/**
 * Build a generic cover page for any non-MNDA document.
 */
export function buildGenericCoverPage(
  data: GenericFormData,
  config: DocumentConfig
): string {
  const p1Company = data.party1Company || `[${config.party1Label} Name]`;
  const p1Name = data.party1Name || "";
  const p1Title = data.party1Title || "";
  const p1Address = data.party1NoticeAddress || "";
  const p1Date = data.party1Date ? formatDate(data.party1Date) : "[Date]";

  const p2Company = data.party2Company || `[${config.party2Label} Name]`;
  const p2Name = data.party2Name || "";
  const p2Title = data.party2Title || "";
  const p2Address = data.party2NoticeAddress || "";
  const p2Date = data.party2Date ? formatDate(data.party2Date) : "[Date]";

  // Build key terms section from non-party fields
  const keyTermLines = config.keyTermFields
    .filter((f) => data[f])
    .map((f) => {
      const label = config.templateFields.find((tf) => tf.field === f)?.placeholder ?? f;
      const value = f.toLowerCase().includes("date") ? formatDate(data[f]) : data[f];
      return `**${label}:** ${value}`;
    });

  const keyTermsSection =
    keyTermLines.length > 0
      ? `### Key Terms\n\n${keyTermLines.join("\n\n")}\n\n`
      : "";

  const modificationsSection = data.modifications
    ? `### Modifications\n\n${data.modifications}\n\n`
    : "";

  const partyBlock = (
    label: string,
    company: string,
    name: string,
    title: string,
    address: string,
    date: string
  ) => `**${label}:** ${company}

${name ? `**Signed by:** ${name}` : ""}${title ? ` (${title})` : ""}

${address ? `**Notice address:** ${address}\n\n` : ""}**Date:** ${date}`;

  return `# ${config.name}

${keyTermsSection}${modificationsSection}By signing below, each party agrees to the terms of this ${config.name}.

---

${partyBlock(config.party1Label, p1Company, p1Name, p1Title, p1Address, p1Date)}

---

${partyBlock(config.party2Label, p2Company, p2Name, p2Title, p2Address, p2Date)}

---
`;
}

/**
 * Fill all placeholder spans in a generic document template.
 * Handles coverpage_link, keyterms_link, orderform_link, businessterms_link, sow_link.
 */
export function fillGenericTemplate(
  raw: string,
  data: GenericFormData,
  config: DocumentConfig
): string {
  // Build a map from placeholder display text → field value for all template fields
  const replacements: Record<string, string> = {};
  for (const tf of config.templateFields) {
    if (tf.placeholder && tf.placeholderClass) {
      const value = data[tf.field];
      if (value) {
        // Format dates automatically
        const isDateField =
          tf.field.toLowerCase().includes("date") ||
          tf.placeholder.toLowerCase().includes("date") ||
          tf.placeholder.toLowerCase().includes("period") ||
          tf.field === "term";
        replacements[tf.placeholder] = isDateField && value.match(/^\d{4}-\d{2}-\d{2}$/)
          ? formatDate(value)
          : value;
      }
    }
  }

  let result = raw;

  // Replace all span placeholder classes
  const allClasses = ["coverpage_link", "keyterms_link", "orderform_link", "businessterms_link", "sow_link"];
  for (const cls of allClasses) {
    // Use a literal regex-style pattern; escape the class name for safety
    const pattern = new RegExp(`<span class="${cls}">([\\s\\S]+?)<\\/span>`, "g");
    result = result.replace(pattern, (_, field) => replacements[field.trim()] ?? field.trim());
  }

  // Remove remaining span tags, keep text content
  result = result.replace(/<span[\s\S]*?>([\s\S]*?)<\/span>/g, "$1");
  result = result.replace(/<label>[\s\S]*?<\/label>/g, "");

  return result;
}

/**
 * Build the complete generic document as two separate sections.
 * Returns { coverPage, standardTerms } so callers can render them
 * as separate preview sections (enabling page-break PDF generation).
 */
export function buildGenericDocument(
  standardTermsRaw: string,
  data: GenericFormData,
  config: DocumentConfig
): { coverPage: string; standardTerms: string } {
  return {
    coverPage: buildGenericCoverPage(data, config),
    standardTerms: fillGenericTemplate(standardTermsRaw, data, config),
  };
}
