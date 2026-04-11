"""
Per-document configs for the chat endpoint.
Each config defines the ordered field questions and placeholder mappings.
MNDA is handled separately in chat.py for backward compatibility.
"""
from dataclasses import dataclass, field as dc_field
from typing import Optional

from pydantic import create_model


@dataclass
class FieldQuestion:
    field_name: str
    question: Optional[str]
    condition_field: Optional[str] = None
    condition_value: Optional[str] = None


@dataclass
class DocumentConfig:
    id: str
    name: str
    description: str
    template_file: str
    party1_label: str  # e.g. "Provider", "Company"
    party2_label: str  # e.g. "Customer", "Partner"
    field_questions: list[FieldQuestion]
    # Maps field_name → placeholder display text in the template spans
    field_to_placeholder: dict[str, str]
    # All span classes that contain replaceable placeholders
    placeholder_classes: list[str]
    system_context: str = ""

    def __post_init__(self):
        fields = [fq.field_name for fq in self.field_questions]
        FieldUpdates = create_model(
            f"{self.id}_FieldUpdates",
            **{f: (Optional[str], None) for f in fields},
        )

        class _LLMResponse(create_model(  # type: ignore[misc]
            f"{self.id}_LLMResponse",
            reply=(str, ...),
            field_updates=(FieldUpdates, ...),
        )):
            pass

        self.llm_response_model = _LLMResponse


# ─── Shared tail questions (party info + modifications) ──────────────────────

def _party_questions(p1_label: str, p2_label: str) -> list[FieldQuestion]:
    return [
        FieldQuestion("party1Company", f"What is the full legal name of the {p1_label}?"),
        FieldQuestion("party1Name", f"What is the name of the person signing on behalf of the {p1_label}?"),
        FieldQuestion("party1Title", f"What is their title or position?"),
        FieldQuestion("party1NoticeAddress", f"What is the notice address for the {p1_label} (email or postal)?"),
        FieldQuestion("party1Date", f"What date will the {p1_label} sign?"),
        FieldQuestion("party2Company", f"What is the full legal name of the {p2_label}?"),
        FieldQuestion("party2Name", f"What is the name of the person signing on behalf of the {p2_label}?"),
        FieldQuestion("party2Title", f"What is their title or position?"),
        FieldQuestion("party2NoticeAddress", f"What is the notice address for the {p2_label} (email or postal)?"),
        FieldQuestion("party2Date", f"What date will the {p2_label} sign?"),
        FieldQuestion("modifications", "Are there any modifications to the standard terms, or shall we use them as-is?"),
    ]


def _party_placeholder_map(p1_label: str, p2_label: str) -> dict[str, str]:
    return {
        "party1Company": p1_label,
        "party2Company": p2_label,
    }


# ─── Document configs ─────────────────────────────────────────────────────────

DOCUMENT_CONFIGS: dict[str, DocumentConfig] = {}


def _register(cfg: DocumentConfig) -> DocumentConfig:
    DOCUMENT_CONFIGS[cfg.id] = cfg
    return cfg


_register(DocumentConfig(
    id="ai-addendum",
    name="AI Addendum",
    description=(
        "Addendum to an existing agreement governing the use of AI/ML services, "
        "covering input/output ownership, model training restrictions, and AI-specific disclaimers."
    ),
    template_file="AI-Addendum.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is an AI Addendum — an attachment to a broader agreement governing how AI/ML "
        "services may use customer data for training and improvement. Key fields include which "
        "Training Data is in scope, the permitted Training Purposes, and any Improvement or "
        "Training Restrictions the customer requires."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this AI Addendum be effective from?"),
        FieldQuestion("agreement", "What is the name of the parent agreement this Addendum attaches to (e.g. 'Cloud Service Agreement dated 2025-01-01')?"),
        FieldQuestion("trainingData", "What categories of Training Data are covered — what customer data may (or may not) be used?"),
        FieldQuestion("trainingPurposes", "For what Training Purposes may the Provider use this data (e.g. 'improving the service', 'training AI models')?"),
        FieldQuestion("improvementRestrictions", "Are there any Improvement Restrictions — things the Provider may NOT use the data for?"),
        FieldQuestion("trainingRestrictions", "Are there any Training Restrictions — for example, prohibiting use of personal data?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this Addendum?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes (e.g. 'courts located in San Francisco, CA')?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "trainingData": "Training Data",
        "trainingPurposes": "Training Purposes",
        "improvementRestrictions": "Improvement Restrictions",
        "trainingRestrictions": "Training Restrictions",
    },
    placeholder_classes=["coverpage_link"],
))


_register(DocumentConfig(
    id="baa",
    name="Business Associate Agreement",
    description=(
        "HIPAA-compliant BAA governing how a business associate handles protected health "
        "information (PHI) on behalf of a covered entity."
    ),
    template_file="BAA.md",
    party1_label="Provider",
    party2_label="Company",
    system_context=(
        "This is a HIPAA Business Associate Agreement (BAA). The Provider is the business "
        "associate handling protected health information (PHI) on behalf of the Company "
        "(the covered entity). Key fields: the parent Agreement name, the Breach Notification "
        "Period (HIPAA requires 60 days but parties may agree to less), and any Limitations "
        "on the Provider's liability."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this BAA be effective from?"),
        FieldQuestion("agreement", "What is the name of the underlying services agreement this BAA accompanies (e.g. 'Cloud Service Agreement')?"),
        FieldQuestion("breachNotificationPeriod", "What is the Breach Notification Period — how many days does the Provider have to notify the Company of a PHI breach (HIPAA maximum is 60 days)?"),
        FieldQuestion("limitations", "Are there any liability limitations or other special terms to note?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this BAA?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Company"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Company"),
        "effectiveDate": "BAA Effective Date",
        "agreement": "Agreement",
        "breachNotificationPeriod": "Breach Notification Period",
        "limitations": "Limitations",
    },
    placeholder_classes=["keyterms_link"],
))


_register(DocumentConfig(
    id="csa",
    name="Cloud Service Agreement",
    description=(
        "Comprehensive agreement for SaaS/cloud service providers and customers, covering "
        "access rights, restrictions, payment, data privacy, confidentiality, and indemnification."
    ),
    template_file="CSA.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a Cloud Service Agreement (CSA) for a SaaS or cloud service. "
        "Key fields: Subscription Period (e.g. '1 year from Effective Date'), Order Date, "
        "Payment Process (e.g. 'net 30', 'annual upfront'), Technical Support level, "
        "Governing Law, Chosen Courts, and the General Cap Amount (the maximum liability "
        "cap, often 12 months of fees paid)."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this agreement be effective from?"),
        FieldQuestion("subscriptionPeriod", "What is the Subscription Period (e.g. '1 year from the Order Date', '12 months')?"),
        FieldQuestion("orderDate", "What is the Order Date — when is the subscription starting?"),
        FieldQuestion("paymentProcess", "What are the payment terms (e.g. 'net 30 days', 'annual in advance')?"),
        FieldQuestion("technicalSupport", "What level of Technical Support is included (e.g. 'email support during business hours', 'standard support per the support policy')?"),
        FieldQuestion("generalCapAmount", "What is the General Cap Amount for liability (e.g. '12 months of fees paid', '$50,000')?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "effectiveDate": "Effective Date",
        "subscriptionPeriod": "Subscription Period",
        "orderDate": "Order Date",
        "paymentProcess": "Payment Process",
        "technicalSupport": "Technical Support",
        "generalCapAmount": "General Cap Amount",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["coverpage_link", "keyterms_link", "orderform_link"],
))


_register(DocumentConfig(
    id="design-partner",
    name="Design Partner Agreement",
    description=(
        "Agreement for early-access design partner programs, granting product access in "
        "exchange for feedback to help the provider develop and improve their product."
    ),
    template_file="design-partner-agreement.md",
    party1_label="Provider",
    party2_label="Partner",
    system_context=(
        "This is a Design Partner Agreement for an early-access or beta program. "
        "The Provider gives the Partner early access to its product in exchange for "
        "structured feedback. Key fields: Program name (what the design partner program "
        "is called), Term (how long the program lasts, e.g. '6 months'), Fees (if any — "
        "often $0 or a nominal amount), and the Notice Address for formal notices."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this Design Partner Agreement be effective from?"),
        FieldQuestion("program", "What is the name of the design partner or beta program?"),
        FieldQuestion("term", "How long does the design partner program last (e.g. '6 months', '1 year')?"),
        FieldQuestion("fees", "Are there any fees the Partner will pay, or is access provided at no charge?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Partner"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Partner"),
        "effectiveDate": "Effective Date",
        "program": "Program",
        "term": "Term",
        "fees": "Fees",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["keyterms_link"],
))


_register(DocumentConfig(
    id="dpa",
    name="Data Processing Agreement",
    description=(
        "GDPR-compliant data processing agreement governing how a service provider "
        "processes personal data on behalf of a customer, including SCCs for international transfers."
    ),
    template_file="DPA.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a GDPR Data Processing Agreement (DPA). The Provider processes personal "
        "data on behalf of the Customer (the data controller). Key fields: the parent "
        "Agreement name, the Nature and Purpose of Processing (why is data being processed), "
        "Categories of Personal Data (what types of data are processed, e.g. 'email addresses, "
        "usage data'), Categories of Data Subjects (whose data, e.g. 'Customer's end users'), "
        "Duration of Processing (how long), and the Governing Member State for GDPR purposes "
        "(typically where the Customer is established in the EU/EEA)."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this DPA be effective from?"),
        FieldQuestion("agreement", "What is the name of the parent services agreement this DPA accompanies?"),
        FieldQuestion("natureAndPurpose", "What is the Nature and Purpose of Processing — why is the Provider processing personal data?"),
        FieldQuestion("categoriesOfPersonalData", "What Categories of Personal Data are processed (e.g. 'names, email addresses, usage logs')?"),
        FieldQuestion("categoriesOfDataSubjects", "What Categories of Data Subjects are involved (e.g. 'Customer's end users', 'Customer's employees')?"),
        FieldQuestion("durationOfProcessing", "What is the Duration of Processing — how long will data be processed (e.g. 'for the term of the Agreement')?"),
        FieldQuestion("governingMemberState", "Which EU/EEA member state governs disputes under this DPA (where is the Customer established)?"),
        FieldQuestion("securityPolicy", "Does the Provider have a Security Policy URL or document to reference?"),
        FieldQuestion("governingLaw", "Which country or state's laws govern this DPA?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "agreement": "Agreement",
        "natureAndPurpose": "Nature and Purpose of Processing",
        "categoriesOfPersonalData": "Categories of Personal Data",
        "categoriesOfDataSubjects": "Categories of Data Subjects",
        "durationOfProcessing": "Duration of Processing",
        "governingMemberState": "Governing Member State",
        "securityPolicy": "Security Policy",
    },
    placeholder_classes=["keyterms_link"],
))


_register(DocumentConfig(
    id="partnership",
    name="Partnership Agreement",
    description=(
        "Standard terms for business partnerships covering mutual obligations, trademark "
        "licensing, payment, confidentiality, and liability between two companies."
    ),
    template_file="Partnership-Agreement.md",
    party1_label="Company",
    party2_label="Partner",
    system_context=(
        "This is a Partnership Agreement between two companies. The Company (Party 1) and "
        "the Partner (Party 2) are entering a formal business partnership. Key fields: "
        "Brand Guidelines (how the Company's brand/trademark may be used), Territory "
        "(geographic scope of the partnership), Obligations (what each party will do), "
        "Payment Schedule (when payments are made), Payment Process (how payments are made), "
        "End Date (when the partnership ends if fixed-term), and General Cap Amount for liability."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this Partnership Agreement be effective from?"),
        FieldQuestion("brandGuidelines", "Are there Brand Guidelines the Partner must follow when using the Company's name/brand (or reference a URL where they're published)?"),
        FieldQuestion("obligations", "What are the core Obligations of each party under this partnership?"),
        FieldQuestion("territory", "What is the Territory for this partnership (e.g. 'North America', 'worldwide')?"),
        FieldQuestion("paymentSchedule", "What is the Payment Schedule (e.g. 'monthly', 'quarterly', 'upon milestone completion')?"),
        FieldQuestion("paymentProcess", "What is the Payment Process (e.g. 'net 30 days from invoice', 'wire transfer')?"),
        FieldQuestion("endDate", "Is there an End Date for this partnership, or is it ongoing until terminated?"),
        FieldQuestion("generalCapAmount", "What is the General Cap Amount for liability (e.g. 'fees paid in the prior 12 months')?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Company", "Partner"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Company", "Partner"),
        "effectiveDate": "Effective Date",
        "brandGuidelines": "Brand Guidelines",
        "obligations": "Obligations",
        "territory": "Territory",
        "paymentSchedule": "Payment Schedule",
        "paymentProcess": "Payment Process",
        "endDate": "End Date",
        "generalCapAmount": "General Cap Amount",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["keyterms_link", "businessterms_link"],
))


_register(DocumentConfig(
    id="pilot",
    name="Pilot Agreement",
    description=(
        "Short-term pilot or proof-of-concept agreement granting limited product access "
        "for evaluation purposes before committing to a long-term agreement."
    ),
    template_file="Pilot-Agreement.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a Pilot Agreement for a short-term evaluation or proof-of-concept. "
        "The Provider gives the Customer temporary access to evaluate the product. "
        "Key fields: Pilot Period (how long the pilot lasts, e.g. '30 days', '3 months'), "
        "General Cap Amount (liability cap, often a nominal amount like $1,000), "
        "Notice Address for formal notices, Governing Law, and Chosen Courts."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this Pilot Agreement be effective from?"),
        FieldQuestion("pilotPeriod", "What is the Pilot Period — how long will the evaluation run (e.g. '30 days', '3 months')?"),
        FieldQuestion("generalCapAmount", "What is the General Cap Amount for liability during the pilot (e.g. '$1,000', 'fees paid')?"),
        FieldQuestion("noticeAddress", "What is the Notice Address for formal notices under this agreement?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "effectiveDate": "Effective Date",
        "pilotPeriod": "Pilot Period",
        "generalCapAmount": "General Cap Amount",
        "noticeAddress": "Notice Address",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["orderform_link"],
))


_register(DocumentConfig(
    id="psa",
    name="Professional Services Agreement",
    description=(
        "Agreement for professional services engagements covering SOW-based work, "
        "deliverable ownership, payment terms, IP rights, confidentiality, and indemnification."
    ),
    template_file="psa.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a Professional Services Agreement (PSA) for services delivered via a "
        "Statement of Work (SOW). Key fields: SOW Term (how long this SOW runs), "
        "Deliverables (what will be produced), Fees (payment amount), Payment Period "
        "(when invoices are due, e.g. 'net 30'), Rejection Period (how many days the "
        "Customer has to accept/reject deliverables), and General Cap Amount for liability."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this PSA be effective from?"),
        FieldQuestion("sowTerm", "What is the SOW Term — how long does this Statement of Work run?"),
        FieldQuestion("deliverables", "What are the Deliverables — what will the Provider produce or deliver?"),
        FieldQuestion("fees", "What are the Fees for this engagement?"),
        FieldQuestion("paymentPeriod", "What is the Payment Period — when are invoices due (e.g. 'net 30 days')?"),
        FieldQuestion("rejectionPeriod", "What is the Rejection Period — how many days does the Customer have to accept or reject a deliverable (e.g. '10 business days')?"),
        FieldQuestion("generalCapAmount", "What is the General Cap Amount for liability (e.g. 'fees paid in the prior 3 months')?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "effectiveDate": "Effective Date",
        "sowTerm": "SOW Term",
        "deliverables": "Deliverables",
        "fees": "Fees",
        "paymentPeriod": "Payment Period",
        "rejectionPeriod": "Rejection Period",
        "generalCapAmount": "General Cap Amount",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["keyterms_link", "sow_link"],
))


_register(DocumentConfig(
    id="sla",
    name="Service Level Agreement",
    description=(
        "Defines uptime and response time commitments for cloud services, including "
        "service credit calculations and remedies for failing to meet targets."
    ),
    template_file="sla.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a Service Level Agreement (SLA) defining uptime and support commitments. "
        "Key fields: Subscription Period (what period this SLA covers), Target Uptime "
        "(e.g. '99.9%'), Target Response Time for support tickets, Support Channel "
        "(how to reach support), Uptime Credit (what credit the Customer receives if uptime "
        "is missed), Response Time Credit (credit for missed response times), and "
        "Scheduled Downtime (any planned maintenance windows)."
    ),
    field_questions=[
        FieldQuestion("subscriptionPeriod", "What Subscription Period does this SLA cover (e.g. '2025 calendar year', 'per calendar month')?"),
        FieldQuestion("targetUptime", "What is the Target Uptime percentage (e.g. '99.9%', '99.5%')?"),
        FieldQuestion("targetResponseTime", "What is the Target Response Time for support tickets (e.g. '4 business hours for P1', '1 business day')?"),
        FieldQuestion("supportChannel", "What is the Support Channel — how does the Customer submit support requests (e.g. 'support@example.com', 'the help portal')?"),
        FieldQuestion("uptimeCredit", "What Uptime Credit does the Customer receive when uptime targets are missed (e.g. '10% of monthly fees for each 0.1% below target')?"),
        FieldQuestion("responseTimeCredit", "What Response Time Credit applies when response time targets are missed?"),
        FieldQuestion("scheduledDowntime", "What Scheduled Downtime is excluded from uptime calculations (e.g. 'up to 4 hours per month with 48 hours notice')?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this SLA?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "subscriptionPeriod": "Subscription Period",
        "targetUptime": "Target Uptime",
        "targetResponseTime": "Target Response Time",
        "supportChannel": "Support Channel",
        "uptimeCredit": "Uptime Credit",
        "responseTimeCredit": "Response Time Credit",
        "scheduledDowntime": "Scheduled Downtime",
    },
    placeholder_classes=["coverpage_link", "orderform_link"],
))


_register(DocumentConfig(
    id="software-license",
    name="Software License Agreement",
    description=(
        "Agreement for on-premise or self-hosted software licenses, covering installation "
        "rights, restrictions, payment, warranties, and IP ownership."
    ),
    template_file="Software-License-Agreement.md",
    party1_label="Provider",
    party2_label="Customer",
    system_context=(
        "This is a Software License Agreement for on-premise or self-hosted software. "
        "Key fields: Subscription Period (license duration), Order Date, Payment Process "
        "(payment terms), Permitted Uses (what the Customer may do with the software), "
        "License Limits (any seat counts, instance limits, or usage restrictions), "
        "Warranty Period (how long the Provider warrants the software), and General Cap Amount."
    ),
    field_questions=[
        FieldQuestion("effectiveDate", "What date should this Software License Agreement be effective from?"),
        FieldQuestion("subscriptionPeriod", "What is the Subscription Period — how long is the license valid (e.g. '1 year', 'perpetual')?"),
        FieldQuestion("orderDate", "What is the Order Date — when does the license term start?"),
        FieldQuestion("paymentProcess", "What are the payment terms (e.g. 'net 30 days from invoice', 'upfront annual fee')?"),
        FieldQuestion("permittedUses", "What are the Permitted Uses — what may the Customer do with the software?"),
        FieldQuestion("licenseLimits", "Are there License Limits — seat counts, named users, instances, or other usage restrictions?"),
        FieldQuestion("warrantyPeriod", "What is the Warranty Period — how long does the Provider warrant the software (e.g. '90 days')?"),
        FieldQuestion("generalCapAmount", "What is the General Cap Amount for liability (e.g. 'fees paid in the prior 12 months')?"),
        FieldQuestion("governingLaw", "Which US state's laws govern this agreement?"),
        FieldQuestion("chosenCourts", "Which courts should handle any disputes?"),
        *_party_questions("Provider", "Customer"),
    ],
    field_to_placeholder={
        **_party_placeholder_map("Provider", "Customer"),
        "effectiveDate": "Effective Date",
        "subscriptionPeriod": "Subscription Period",
        "orderDate": "Order Date",
        "paymentProcess": "Payment Process",
        "permittedUses": "Permitted Uses",
        "licenseLimits": "License Limits",
        "warrantyPeriod": "Warranty Period",
        "generalCapAmount": "General Cap Amount",
        "governingLaw": "Governing Law",
        "chosenCourts": "Chosen Courts",
    },
    placeholder_classes=["coverpage_link", "keyterms_link", "orderform_link"],
))
