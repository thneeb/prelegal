export interface NdaFormData {
  // Purpose & dates
  purpose: string;
  effectiveDate: string;

  // MNDA Term
  mndaTermType: "years" | "until_terminated";
  mndaTermYears: string;

  // Term of Confidentiality
  confidentialityTermType: "years" | "perpetual";
  confidentialityTermYears: string;

  // Governing law
  governingLaw: string;
  jurisdiction: string;

  // Modifications
  modifications: string;

  // Party 1
  party1Name: string;
  party1Title: string;
  party1Company: string;
  party1NoticeAddress: string;
  party1Date: string;
  party1Signature: string; // base64 data URL

  // Party 2
  party2Name: string;
  party2Title: string;
  party2Company: string;
  party2NoticeAddress: string;
  party2Date: string;
  party2Signature: string; // base64 data URL
}

export const defaultFormData: NdaFormData = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: new Date().toISOString().split("T")[0],
  mndaTermType: "years",
  mndaTermYears: "1",
  confidentialityTermType: "years",
  confidentialityTermYears: "1",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1Name: "",
  party1Title: "",
  party1Company: "",
  party1NoticeAddress: "",
  party1Date: new Date().toISOString().split("T")[0],
  party1Signature: "",
  party2Name: "",
  party2Title: "",
  party2Company: "",
  party2NoticeAddress: "",
  party2Date: new Date().toISOString().split("T")[0],
  party2Signature: "",
};
