import { buildCoverPage, fillStandardTerms, buildFullDocument } from "../app/utils/templateUtils";
import { defaultFormData, NdaFormData } from "../app/types/nda";

// Helpers
const base = (): NdaFormData => ({ ...defaultFormData });

// ─── buildCoverPage ───────────────────────────────────────────────────────────

describe("buildCoverPage", () => {
  it("includes the document title", () => {
    const md = buildCoverPage(base());
    expect(md).toContain("# Mutual Non-Disclosure Agreement");
  });

  it("inserts the purpose text", () => {
    const data = base();
    data.purpose = "Testing a new SaaS product";
    const md = buildCoverPage(data);
    expect(md).toContain("Testing a new SaaS product");
  });

  it("formats the effective date as long-form", () => {
    const data = base();
    data.effectiveDate = "2025-06-15";
    const md = buildCoverPage(data);
    expect(md).toContain("June 15, 2025");
  });

  it("shows N year(s) MNDA term when type is years", () => {
    const data = base();
    data.mndaTermType = "years";
    data.mndaTermYears = "2";
    const md = buildCoverPage(data);
    expect(md).toContain("2 year(s) from Effective Date");
  });

  it("shows until-terminated language when type is until_terminated", () => {
    const data = base();
    data.mndaTermType = "until_terminated";
    const md = buildCoverPage(data);
    expect(md).toContain("Continues until terminated");
  });

  it("shows N year(s) confidentiality term", () => {
    const data = base();
    data.confidentialityTermType = "years";
    data.confidentialityTermYears = "3";
    const md = buildCoverPage(data);
    expect(md).toContain("3 year(s) from Effective Date");
  });

  it("shows perpetuity language for perpetual confidentiality", () => {
    const data = base();
    data.confidentialityTermType = "perpetual";
    const md = buildCoverPage(data);
    expect(md).toContain("In perpetuity");
  });

  it("inserts governing law and jurisdiction", () => {
    const data = base();
    data.governingLaw = "Delaware";
    data.jurisdiction = "courts located in Wilmington, DE";
    const md = buildCoverPage(data);
    expect(md).toContain("Delaware");
    expect(md).toContain("courts located in Wilmington, DE");
  });

  it("includes modifications section when modifications are provided", () => {
    const data = base();
    data.modifications = "Section 9 replaced with arbitration clause";
    const md = buildCoverPage(data);
    expect(md).toContain("MNDA Modifications");
    expect(md).toContain("Section 9 replaced with arbitration clause");
  });

  it("omits modifications section when modifications are empty", () => {
    const data = base();
    data.modifications = "";
    const md = buildCoverPage(data);
    expect(md).not.toContain("MNDA Modifications");
  });

  it("falls back gracefully when purpose is empty", () => {
    const data = base();
    data.purpose = "";
    const md = buildCoverPage(data);
    expect(md).toContain("[Purpose not specified]");
  });

  it("falls back to [State] when governingLaw is empty", () => {
    const data = base();
    data.governingLaw = "";
    const md = buildCoverPage(data);
    expect(md).toContain("[State]");
  });

  it("defaults to 1 year when mndaTermYears is empty", () => {
    const data = base();
    data.mndaTermType = "years";
    data.mndaTermYears = "";
    const md = buildCoverPage(data);
    expect(md).toContain("1 year(s)");
  });
});

// ─── fillStandardTerms ────────────────────────────────────────────────────────

describe("fillStandardTerms", () => {
  const template = `
Some text about the <span class="coverpage_link">Purpose</span> here.
The agreement starts on <span class="coverpage_link">Effective Date</span>.
It lasts for the <span class="coverpage_link">MNDA Term</span>.
Confidentiality lasts for the <span class="coverpage_link">Term of Confidentiality</span>.
Governed by <span class="coverpage_link">Governing Law</span>.
Disputes in <span class="coverpage_link">Jurisdiction</span>.
Other <span class="header_2" id="1">Section Header</span> text.
`.trim();

  it("replaces Purpose placeholder", () => {
    const data = base();
    data.purpose = "Exploring a joint venture";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("Exploring a joint venture");
    expect(result).not.toContain('<span class="coverpage_link">Purpose</span>');
  });

  it("replaces Effective Date placeholder with formatted date", () => {
    const data = base();
    data.effectiveDate = "2025-01-20";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("January 20, 2025");
    expect(result).not.toContain('<span class="coverpage_link">Effective Date</span>');
  });

  it("replaces Governing Law placeholder", () => {
    const data = base();
    data.governingLaw = "California";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("California");
  });

  it("replaces Jurisdiction placeholder", () => {
    const data = base();
    data.jurisdiction = "courts located in San Francisco, CA";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("courts located in San Francisco, CA");
  });

  it("replaces MNDA Term when type is years", () => {
    const data = base();
    data.mndaTermType = "years";
    data.mndaTermYears = "2";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("2 year(s) from Effective Date");
  });

  it("replaces MNDA Term when type is until_terminated", () => {
    const data = base();
    data.mndaTermType = "until_terminated";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("the date of termination");
  });

  it("replaces Term of Confidentiality when type is years", () => {
    const data = base();
    data.confidentialityTermType = "years";
    data.confidentialityTermYears = "5";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("5 year(s) from Effective Date");
  });

  it("replaces Term of Confidentiality when type is perpetual", () => {
    const data = base();
    data.confidentialityTermType = "perpetual";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("in perpetuity");
  });

  it("strips non-coverpage_link span tags but keeps their text", () => {
    const data = base();
    const result = fillStandardTerms(template, data);
    expect(result).not.toContain('<span class="header_2"');
    expect(result).toContain("Section Header");
  });

  it("falls back to [Governing Law] when governingLaw is empty", () => {
    const data = base();
    data.governingLaw = "";
    const result = fillStandardTerms(template, data);
    expect(result).toContain("[Governing Law]");
  });

  it("handles multiple occurrences of the same placeholder", () => {
    const multiTemplate = `
<span class="coverpage_link">Purpose</span> and again <span class="coverpage_link">Purpose</span>.
`.trim();
    const data = base();
    data.purpose = "Due diligence";
    const result = fillStandardTerms(multiTemplate, data);
    const count = (result.match(/Due diligence/g) || []).length;
    expect(count).toBe(2);
  });
});

// ─── buildFullDocument ────────────────────────────────────────────────────────

describe("buildFullDocument", () => {
  const minimalTemplate = `Standard Terms body with <span class="coverpage_link">Purpose</span>.`;

  it("contains the cover page title", () => {
    const doc = buildFullDocument(minimalTemplate, base());
    expect(doc).toContain("# Mutual Non-Disclosure Agreement");
  });

  it("contains the standard terms heading", () => {
    const doc = buildFullDocument(minimalTemplate, base());
    expect(doc).toContain("# Standard Terms");
  });

  it("cover page appears before standard terms", () => {
    const doc = buildFullDocument(minimalTemplate, base());
    const coverIdx = doc.indexOf("# Mutual Non-Disclosure Agreement");
    const termsIdx = doc.indexOf("# Standard Terms");
    expect(coverIdx).toBeLessThan(termsIdx);
  });

  it("purpose value appears in both cover page and standard terms", () => {
    const data = base();
    data.purpose = "Unique purpose value 12345";
    const doc = buildFullDocument(minimalTemplate, data);
    const count = (doc.match(/Unique purpose value 12345/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
