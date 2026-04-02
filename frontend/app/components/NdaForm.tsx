"use client";

import { NdaFormData } from "../types/nda";
import SignatureField from "./SignatureField";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
  onDownload: () => void;
  downloading: boolean;
}

function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
      >
        {label}
      </label>
      {hint && <p className="text-xs text-gray-400 italic">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const textareaCls =
  "w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none";

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="pt-4 pb-1 border-b border-gray-200">
      <h3 className="text-xs font-bold text-blue-900 uppercase tracking-widest">{title}</h3>
    </div>
  );
}

export default function NdaForm({ data, onChange, onDownload, downloading }: NdaFormProps) {
  function set(field: keyof NdaFormData, value: string) {
    onChange({ ...data, [field]: value });
  }

  return (
    <form className="space-y-4 px-1" onSubmit={(e) => e.preventDefault()}>
      <SectionHeading title="Agreement Details" />

      <Field label="Purpose" hint="How Confidential Information may be used" id="purpose">
        <textarea
          id="purpose"
          rows={2}
          className={textareaCls}
          value={data.purpose}
          onChange={(e) => set("purpose", e.target.value)}
        />
      </Field>

      <Field label="Effective Date" id="effective-date">
        <input
          id="effective-date"
          type="date"
          className={inputCls}
          value={data.effectiveDate}
          onChange={(e) => set("effectiveDate", e.target.value)}
        />
      </Field>

      <Field label="MNDA Term" hint="How long this agreement lasts">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="mndaTermType"
              value="years"
              checked={data.mndaTermType === "years"}
              onChange={() => set("mndaTermType", "years")}
              className="accent-blue-600"
            />
            Expires after
            <input
              type="number"
              min={1}
              max={10}
              className="w-14 rounded border border-gray-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={data.mndaTermYears}
              onChange={(e) => set("mndaTermYears", e.target.value)}
            />
            year(s)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="mndaTermType"
              value="until_terminated"
              checked={data.mndaTermType === "until_terminated"}
              onChange={() => set("mndaTermType", "until_terminated")}
              className="accent-blue-600"
            />
            Until terminated
          </label>
        </div>
      </Field>

      <Field label="Term of Confidentiality" hint="How long Confidential Information is protected">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="confidentialityTermType"
              value="years"
              checked={data.confidentialityTermType === "years"}
              onChange={() => set("confidentialityTermType", "years")}
              className="accent-blue-600"
            />
            <input
              type="number"
              min={1}
              max={10}
              className="w-14 rounded border border-gray-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={data.confidentialityTermYears}
              onChange={(e) => set("confidentialityTermYears", e.target.value)}
            />
            year(s) from Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="confidentialityTermType"
              value="perpetual"
              checked={data.confidentialityTermType === "perpetual"}
              onChange={() => set("confidentialityTermType", "perpetual")}
              className="accent-blue-600"
            />
            In perpetuity
          </label>
        </div>
      </Field>

      <Field label="Governing Law" id="governing-law">
        <input
          id="governing-law"
          type="text"
          placeholder="e.g. Delaware"
          className={inputCls}
          value={data.governingLaw}
          onChange={(e) => set("governingLaw", e.target.value)}
        />
      </Field>

      <Field label="Jurisdiction" id="jurisdiction">
        <input
          id="jurisdiction"
          type="text"
          placeholder="e.g. courts located in Wilmington, DE"
          className={inputCls}
          value={data.jurisdiction}
          onChange={(e) => set("jurisdiction", e.target.value)}
        />
      </Field>

      <Field label="MNDA Modifications" hint="Optional — list any changes to the standard terms" id="modifications">
        <textarea
          id="modifications"
          rows={2}
          className={textareaCls}
          placeholder="None"
          value={data.modifications}
          onChange={(e) => set("modifications", e.target.value)}
        />
      </Field>

      <SectionHeading title="Party 1" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Print Name" id="party1-name">
          <input
            id="party1-name"
            type="text"
            className={inputCls}
            value={data.party1Name}
            onChange={(e) => set("party1Name", e.target.value)}
          />
        </Field>
        <Field label="Title" id="party1-title">
          <input
            id="party1-title"
            type="text"
            className={inputCls}
            value={data.party1Title}
            onChange={(e) => set("party1Title", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Company" id="party1-company">
        <input
          id="party1-company"
          type="text"
          className={inputCls}
          value={data.party1Company}
          onChange={(e) => set("party1Company", e.target.value)}
        />
      </Field>

      <Field label="Notice Address" id="party1-notice">
        <input
          id="party1-notice"
          type="text"
          placeholder="Email or postal address"
          className={inputCls}
          value={data.party1NoticeAddress}
          onChange={(e) => set("party1NoticeAddress", e.target.value)}
        />
      </Field>

      <Field label="Date" id="party1-date">
        <input
          id="party1-date"
          type="date"
          className={inputCls}
          value={data.party1Date}
          onChange={(e) => set("party1Date", e.target.value)}
        />
      </Field>

      <SignatureField
        label="Signature"
        value={data.party1Signature}
        onChange={(v) => set("party1Signature", v)}
      />

      <SectionHeading title="Party 2" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Print Name" id="party2-name">
          <input
            id="party2-name"
            type="text"
            className={inputCls}
            value={data.party2Name}
            onChange={(e) => set("party2Name", e.target.value)}
          />
        </Field>
        <Field label="Title" id="party2-title">
          <input
            id="party2-title"
            type="text"
            className={inputCls}
            value={data.party2Title}
            onChange={(e) => set("party2Title", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Company" id="party2-company">
        <input
          id="party2-company"
          type="text"
          className={inputCls}
          value={data.party2Company}
          onChange={(e) => set("party2Company", e.target.value)}
        />
      </Field>

      <Field label="Notice Address" id="party2-notice">
        <input
          id="party2-notice"
          type="text"
          placeholder="Email or postal address"
          className={inputCls}
          value={data.party2NoticeAddress}
          onChange={(e) => set("party2NoticeAddress", e.target.value)}
        />
      </Field>

      <Field label="Date" id="party2-date">
        <input
          id="party2-date"
          type="date"
          className={inputCls}
          value={data.party2Date}
          onChange={(e) => set("party2Date", e.target.value)}
        />
      </Field>

      <SignatureField
        label="Signature"
        value={data.party2Signature}
        onChange={(v) => set("party2Signature", v)}
      />

      <div className="pt-4">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-full rounded bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 active:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {downloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating PDF…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
    </form>
  );
}
