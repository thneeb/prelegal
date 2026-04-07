import {
  buildGenericCoverPage,
  fillGenericTemplate,
  buildGenericDocument,
} from "../app/utils/templateUtils";
import { DOCUMENT_CONFIGS, DocumentConfig } from "../app/document_configs";
import type { GenericFormData } from "../app/utils/templateUtils";

const base = (): GenericFormData => ({});

// ─── buildGenericCoverPage ────────────────────────────────────────────────────

describe("buildGenericCoverPage", () => {
  const config = DOCUMENT_CONFIGS["csa"];

  it("includes the document title", () => {
    const md = buildGenericCoverPage(base(), config);
    expect(md).toContain("# Cloud Service Agreement");
  });

  it("includes the party1 label from config", () => {
    const md = buildGenericCoverPage(base(), config);
    expect(md).toContain("Provider");
  });

  it("includes the party2 label from config", () => {
    const md = buildGenericCoverPage(base(), config);
    expect(md).toContain("Customer");
  });

  it("inserts party1Company when provided", () => {
    const data = { party1Company: "Acme Corp" };
    const md = buildGenericCoverPage(data, config);
    expect(md).toContain("Acme Corp");
  });

  it("inserts party2Company when provided", () => {
    const data = { party2Company: "Globex Inc" };
    const md = buildGenericCoverPage(data, config);
    expect(md).toContain("Globex Inc");
  });

  it("formats party1Date as long-form", () => {
    const data = { party1Date: "2025-06-15" };
    const md = buildGenericCoverPage(data, config);
    expect(md).toContain("June 15, 2025");
  });

  it("shows key terms when present", () => {
    const data = { effectiveDate: "2025-01-01", subscriptionPeriod: "1 year" };
    const md = buildGenericCoverPage(data, config);
    expect(md).toContain("Subscription Period");
    expect(md).toContain("1 year");
  });

  it("omits key terms section when no key term fields are set", () => {
    const md = buildGenericCoverPage(base(), config);
    expect(md).not.toContain("Key Terms");
  });

  it("uses correct party labels for Partnership Agreement", () => {
    const partnerConfig = DOCUMENT_CONFIGS["partnership"];
    const md = buildGenericCoverPage(base(), partnerConfig);
    expect(md).toContain("Company");
    expect(md).toContain("Partner");
  });

  it("uses placeholder when party1Company is empty", () => {
    const md = buildGenericCoverPage(base(), config);
    expect(md).toContain("[Provider Name]");
  });
});

// ─── fillGenericTemplate ──────────────────────────────────────────────────────

describe("fillGenericTemplate", () => {
  const config = DOCUMENT_CONFIGS["pilot"];

  // Build a minimal template that uses orderform_link spans
  const template = [
    'Provider: <span class="orderform_link">Provider</span>.',
    'Customer: <span class="orderform_link">Customer</span>.',
    'Pilot Period: <span class="orderform_link">Pilot Period</span>.',
    'Governing Law: <span class="orderform_link">Governing Law</span>.',
  ].join("\n");

  it("replaces Provider placeholder", () => {
    const data = { party1Company: "Acme" };
    const result = fillGenericTemplate(template, data, config);
    expect(result).toContain("Acme");
    expect(result).not.toContain('<span class="orderform_link">Provider</span>');
  });

  it("replaces Customer placeholder", () => {
    const data = { party2Company: "Globex" };
    const result = fillGenericTemplate(template, data, config);
    expect(result).toContain("Globex");
  });

  it("replaces document-specific placeholder", () => {
    const data = { pilotPeriod: "30 days" };
    const result = fillGenericTemplate(template, data, config);
    expect(result).toContain("30 days");
  });

  it("replaces Governing Law placeholder", () => {
    const data = { governingLaw: "California" };
    const result = fillGenericTemplate(template, data, config);
    expect(result).toContain("California");
  });

  it("leaves placeholder text when field is empty", () => {
    const result = fillGenericTemplate(template, base(), config);
    // span is removed but original text is kept
    expect(result).toContain("Provider");
    expect(result).not.toContain('<span class="orderform_link">');
  });

  it("handles keyterms_link spans for CSA", () => {
    const csaConfig = DOCUMENT_CONFIGS["csa"];
    const csaTemplate = 'Law: <span class="keyterms_link">Governing Law</span>.';
    const data = { governingLaw: "Delaware" };
    const result = fillGenericTemplate(csaTemplate, data, csaConfig);
    expect(result).toContain("Delaware");
  });

  it("handles businessterms_link spans for Partnership", () => {
    const pConfig = DOCUMENT_CONFIGS["partnership"];
    const pTemplate = 'Territory: <span class="businessterms_link">Territory</span>.';
    const data = { territory: "North America" };
    const result = fillGenericTemplate(pTemplate, data, pConfig);
    expect(result).toContain("North America");
  });
});

// ─── buildGenericDocument ─────────────────────────────────────────────────────

describe("buildGenericDocument", () => {
  const config = DOCUMENT_CONFIGS["pilot"];
  const minimalTemplate = 'Standard Terms body with <span class="orderform_link">Pilot Period</span>.';

  it("contains cover page title", () => {
    const { coverPage } = buildGenericDocument(minimalTemplate, base(), config);
    expect(coverPage).toContain("# Pilot Agreement");
  });

  it("contains filled standard terms", () => {
    const data = { pilotPeriod: "60 days" };
    const { standardTerms } = buildGenericDocument(minimalTemplate, data, config);
    expect(standardTerms).toContain("60 days");
  });

  it("party info appears in cover page", () => {
    const data = { party1Company: "Provider Co", party2Company: "Customer Inc" };
    const { coverPage } = buildGenericDocument(minimalTemplate, data, config);
    expect(coverPage).toContain("Provider Co");
    expect(coverPage).toContain("Customer Inc");
  });
});
