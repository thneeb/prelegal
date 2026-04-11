/**
 * Frontend document configurations.
 * Mirrors backend/document_configs.py; used for template loading,
 * placeholder replacement, cover page generation, and UI decisions.
 */

export interface FieldConfig {
  field: string;
  /** Placeholder display text inside the span (e.g. "Effective Date"). null = cover-page-only field */
  placeholder: string | null;
  /** Span class containing this placeholder */
  placeholderClass: string | null;
}

export interface DocumentConfig {
  id: string;
  name: string;
  description: string;
  templateFile: string;
  /** Label for Party 1 (e.g. "Provider", "Company") */
  party1Label: string;
  /** Label for Party 2 (e.g. "Customer", "Partner") */
  party2Label: string;
  /** All span class names used as placeholders in this template */
  placeholderClasses: string[];
  /**
   * Maps field name → { placeholder display text, span class }.
   * Fields not in this map appear on the cover page only (party details, etc.).
   */
  templateFields: FieldConfig[];
  /** True only for MNDA — shows the Form tab */
  hasFormTab: boolean;
  /** Key terms to display in a "Key Terms" section on the cover page (non-party fields) */
  keyTermFields: string[];
}

// ─── Shared party fields (cover-page only, no template placeholder) ──────────

const partyFields = (p1: string, p2: string): FieldConfig[] => [
  { field: "party1Company", placeholder: p1, placeholderClass: null },
  { field: "party1Name", placeholder: null, placeholderClass: null },
  { field: "party1Title", placeholder: null, placeholderClass: null },
  { field: "party1NoticeAddress", placeholder: null, placeholderClass: null },
  { field: "party1Date", placeholder: null, placeholderClass: null },
  { field: "party2Company", placeholder: p2, placeholderClass: null },
  { field: "party2Name", placeholder: null, placeholderClass: null },
  { field: "party2Title", placeholder: null, placeholderClass: null },
  { field: "party2NoticeAddress", placeholder: null, placeholderClass: null },
  { field: "party2Date", placeholder: null, placeholderClass: null },
];

// ─── Document configs ─────────────────────────────────────────────────────────

export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  mnda: {
    id: "mnda",
    name: "Mutual Non-Disclosure Agreement",
    description:
      "Standard terms for a mutual NDA allowing both parties to share confidential information for a defined purpose, with reciprocal confidentiality obligations.",
    templateFile: "Mutual-NDA.md",
    party1Label: "Party 1",
    party2Label: "Party 2",
    placeholderClasses: ["coverpage_link"],
    templateFields: [
      { field: "purpose", placeholder: "Purpose", placeholderClass: "coverpage_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "coverpage_link" },
      { field: "mndaTermType", placeholder: "MNDA Term", placeholderClass: "coverpage_link" },
      { field: "confidentialityTermType", placeholder: "Term of Confidentiality", placeholderClass: "coverpage_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "coverpage_link" },
      { field: "jurisdiction", placeholder: "Jurisdiction", placeholderClass: "coverpage_link" },
      ...partyFields("Party 1", "Party 2"),
    ],
    hasFormTab: true,
    keyTermFields: ["purpose", "effectiveDate", "governingLaw", "jurisdiction"],
  },

  "ai-addendum": {
    id: "ai-addendum",
    name: "AI Addendum",
    description:
      "Addendum to an existing agreement governing the use of AI/ML services, covering input/output ownership, model training restrictions, and AI-specific disclaimers.",
    templateFile: "AI-Addendum.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["coverpage_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "coverpage_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "coverpage_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: null },
      { field: "agreement", placeholder: "Agreement", placeholderClass: null },
      { field: "trainingData", placeholder: "Training Data", placeholderClass: "coverpage_link" },
      { field: "trainingPurposes", placeholder: "Training Purposes", placeholderClass: "coverpage_link" },
      { field: "improvementRestrictions", placeholder: "Improvement Restrictions", placeholderClass: "coverpage_link" },
      { field: "trainingRestrictions", placeholder: "Training Restrictions", placeholderClass: "coverpage_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: null },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: null },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "agreement", "trainingData", "trainingPurposes", "improvementRestrictions", "trainingRestrictions", "governingLaw", "chosenCourts"],
  },

  baa: {
    id: "baa",
    name: "Business Associate Agreement",
    description:
      "HIPAA-compliant BAA governing how a business associate handles protected health information (PHI) on behalf of a covered entity.",
    templateFile: "BAA.md",
    party1Label: "Provider",
    party2Label: "Company",
    placeholderClasses: ["keyterms_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "keyterms_link" },
      { field: "party2Company", placeholder: "Company", placeholderClass: "keyterms_link" },
      { field: "effectiveDate", placeholder: "BAA Effective Date", placeholderClass: "keyterms_link" },
      { field: "agreement", placeholder: "Agreement", placeholderClass: "keyterms_link" },
      { field: "breachNotificationPeriod", placeholder: "Breach Notification Period", placeholderClass: "keyterms_link" },
      { field: "limitations", placeholder: "Limitations", placeholderClass: "keyterms_link" },
      ...partyFields("Provider", "Company"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "agreement", "breachNotificationPeriod", "limitations", "governingLaw", "chosenCourts"],
  },

  csa: {
    id: "csa",
    name: "Cloud Service Agreement",
    description:
      "Comprehensive agreement for SaaS/cloud service providers and customers, covering access rights, restrictions, payment, data privacy, confidentiality, and indemnification.",
    templateFile: "CSA.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["coverpage_link", "keyterms_link", "orderform_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "coverpage_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "coverpage_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "keyterms_link" },
      { field: "subscriptionPeriod", placeholder: "Subscription Period", placeholderClass: "orderform_link" },
      { field: "orderDate", placeholder: "Order Date", placeholderClass: "orderform_link" },
      { field: "paymentProcess", placeholder: "Payment Process", placeholderClass: "orderform_link" },
      { field: "technicalSupport", placeholder: "Technical Support", placeholderClass: "orderform_link" },
      { field: "generalCapAmount", placeholder: "General Cap Amount", placeholderClass: "keyterms_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "keyterms_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "keyterms_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "subscriptionPeriod", "orderDate", "paymentProcess", "technicalSupport", "generalCapAmount", "governingLaw", "chosenCourts"],
  },

  "design-partner": {
    id: "design-partner",
    name: "Design Partner Agreement",
    description:
      "Agreement for early-access design partner programs, granting product access in exchange for feedback to help the provider develop and improve their product.",
    templateFile: "design-partner-agreement.md",
    party1Label: "Provider",
    party2Label: "Partner",
    placeholderClasses: ["keyterms_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "keyterms_link" },
      { field: "party2Company", placeholder: "Partner", placeholderClass: "keyterms_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "keyterms_link" },
      { field: "program", placeholder: "Program", placeholderClass: "keyterms_link" },
      { field: "term", placeholder: "Term", placeholderClass: "keyterms_link" },
      { field: "fees", placeholder: "Fees", placeholderClass: "keyterms_link" },
      { field: "noticeAddress", placeholder: "Notice Address", placeholderClass: "keyterms_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "keyterms_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "keyterms_link" },
      ...partyFields("Provider", "Partner"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "program", "term", "fees", "governingLaw", "chosenCourts"],
  },

  dpa: {
    id: "dpa",
    name: "Data Processing Agreement",
    description:
      "GDPR-compliant data processing agreement governing how a service provider processes personal data on behalf of a customer, including SCCs for international transfers.",
    templateFile: "DPA.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["keyterms_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "keyterms_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "keyterms_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: null },
      { field: "agreement", placeholder: "Agreement", placeholderClass: "keyterms_link" },
      { field: "natureAndPurpose", placeholder: "Nature and Purpose of Processing", placeholderClass: "keyterms_link" },
      { field: "categoriesOfPersonalData", placeholder: "Categories of Personal Data", placeholderClass: "keyterms_link" },
      { field: "categoriesOfDataSubjects", placeholder: "Categories of Data Subjects", placeholderClass: "keyterms_link" },
      { field: "durationOfProcessing", placeholder: "Duration of Processing", placeholderClass: "keyterms_link" },
      { field: "governingMemberState", placeholder: "Governing Member State", placeholderClass: "keyterms_link" },
      { field: "securityPolicy", placeholder: "Security Policy", placeholderClass: "keyterms_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "agreement", "natureAndPurpose", "categoriesOfPersonalData", "categoriesOfDataSubjects", "durationOfProcessing", "governingMemberState", "securityPolicy"],
  },

  partnership: {
    id: "partnership",
    name: "Partnership Agreement",
    description:
      "Standard terms for business partnerships covering mutual obligations, trademark licensing, payment, confidentiality, and liability between two companies.",
    templateFile: "Partnership-Agreement.md",
    party1Label: "Company",
    party2Label: "Partner",
    placeholderClasses: ["keyterms_link", "businessterms_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Company", placeholderClass: "keyterms_link" },
      { field: "party2Company", placeholder: "Partner", placeholderClass: "keyterms_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "keyterms_link" },
      { field: "brandGuidelines", placeholder: "Brand Guidelines", placeholderClass: "keyterms_link" },
      { field: "generalCapAmount", placeholder: "General Cap Amount", placeholderClass: "keyterms_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "keyterms_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "keyterms_link" },
      { field: "obligations", placeholder: "Obligations", placeholderClass: "businessterms_link" },
      { field: "paymentSchedule", placeholder: "Payment Schedule", placeholderClass: "businessterms_link" },
      { field: "paymentProcess", placeholder: "Payment Process", placeholderClass: "businessterms_link" },
      { field: "territory", placeholder: "Territory", placeholderClass: "businessterms_link" },
      { field: "endDate", placeholder: "End Date", placeholderClass: "businessterms_link" },
      ...partyFields("Company", "Partner"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "obligations", "territory", "paymentSchedule", "paymentProcess", "endDate", "brandGuidelines", "generalCapAmount", "governingLaw", "chosenCourts"],
  },

  pilot: {
    id: "pilot",
    name: "Pilot Agreement",
    description:
      "Short-term pilot or proof-of-concept agreement granting limited product access for evaluation purposes before committing to a long-term agreement.",
    templateFile: "Pilot-Agreement.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["orderform_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "orderform_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "orderform_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "orderform_link" },
      { field: "pilotPeriod", placeholder: "Pilot Period", placeholderClass: "orderform_link" },
      { field: "generalCapAmount", placeholder: "General Cap Amount", placeholderClass: "orderform_link" },
      { field: "noticeAddress", placeholder: "Notice Address", placeholderClass: "orderform_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "orderform_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "orderform_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "pilotPeriod", "generalCapAmount", "noticeAddress", "governingLaw", "chosenCourts"],
  },

  psa: {
    id: "psa",
    name: "Professional Services Agreement",
    description:
      "Agreement for professional services engagements covering SOW-based work, deliverable ownership, payment terms, IP rights, confidentiality, and indemnification.",
    templateFile: "psa.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["keyterms_link", "sow_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "keyterms_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "keyterms_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "keyterms_link" },
      { field: "sowTerm", placeholder: "SOW Term", placeholderClass: "keyterms_link" },
      { field: "generalCapAmount", placeholder: "General Cap Amount", placeholderClass: "keyterms_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "keyterms_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "keyterms_link" },
      { field: "deliverables", placeholder: "Deliverables", placeholderClass: "sow_link" },
      { field: "fees", placeholder: "Fees", placeholderClass: "sow_link" },
      { field: "paymentPeriod", placeholder: "Payment Period", placeholderClass: "sow_link" },
      { field: "rejectionPeriod", placeholder: "Rejection Period", placeholderClass: "sow_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "sowTerm", "deliverables", "fees", "paymentPeriod", "rejectionPeriod", "generalCapAmount", "governingLaw", "chosenCourts"],
  },

  sla: {
    id: "sla",
    name: "Service Level Agreement",
    description:
      "Defines uptime and response time commitments for cloud services, including service credit calculations and remedies for failing to meet targets.",
    templateFile: "sla.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["coverpage_link", "orderform_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "coverpage_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "coverpage_link" },
      { field: "subscriptionPeriod", placeholder: "Subscription Period", placeholderClass: "orderform_link" },
      { field: "targetUptime", placeholder: "Target Uptime", placeholderClass: "orderform_link" },
      { field: "targetResponseTime", placeholder: "Target Response Time", placeholderClass: "orderform_link" },
      { field: "supportChannel", placeholder: "Support Channel", placeholderClass: "orderform_link" },
      { field: "uptimeCredit", placeholder: "Uptime Credit", placeholderClass: "orderform_link" },
      { field: "responseTimeCredit", placeholder: "Response Time Credit", placeholderClass: "orderform_link" },
      { field: "scheduledDowntime", placeholder: "Scheduled Downtime", placeholderClass: "orderform_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["subscriptionPeriod", "targetUptime", "targetResponseTime", "supportChannel", "uptimeCredit", "responseTimeCredit", "scheduledDowntime"],
  },

  "software-license": {
    id: "software-license",
    name: "Software License Agreement",
    description:
      "Agreement for on-premise or self-hosted software licenses, covering installation rights, restrictions, payment, warranties, and IP ownership.",
    templateFile: "Software-License-Agreement.md",
    party1Label: "Provider",
    party2Label: "Customer",
    placeholderClasses: ["coverpage_link", "keyterms_link", "orderform_link"],
    templateFields: [
      { field: "party1Company", placeholder: "Provider", placeholderClass: "coverpage_link" },
      { field: "party2Company", placeholder: "Customer", placeholderClass: "coverpage_link" },
      { field: "effectiveDate", placeholder: "Effective Date", placeholderClass: "keyterms_link" },
      { field: "subscriptionPeriod", placeholder: "Subscription Period", placeholderClass: "orderform_link" },
      { field: "orderDate", placeholder: "Order Date", placeholderClass: "orderform_link" },
      { field: "paymentProcess", placeholder: "Payment Process", placeholderClass: "orderform_link" },
      { field: "permittedUses", placeholder: "Permitted Uses", placeholderClass: "orderform_link" },
      { field: "licenseLimits", placeholder: "License Limits", placeholderClass: "orderform_link" },
      { field: "warrantyPeriod", placeholder: "Warranty Period", placeholderClass: "orderform_link" },
      { field: "generalCapAmount", placeholder: "General Cap Amount", placeholderClass: "keyterms_link" },
      { field: "governingLaw", placeholder: "Governing Law", placeholderClass: "keyterms_link" },
      { field: "chosenCourts", placeholder: "Chosen Courts", placeholderClass: "keyterms_link" },
      ...partyFields("Provider", "Customer"),
    ],
    hasFormTab: false,
    keyTermFields: ["effectiveDate", "subscriptionPeriod", "orderDate", "paymentProcess", "permittedUses", "licenseLimits", "warrantyPeriod", "generalCapAmount", "governingLaw", "chosenCourts"],
  },
};
