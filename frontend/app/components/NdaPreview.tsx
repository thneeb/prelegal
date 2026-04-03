"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NdaFormData } from "../types/nda";

interface NdaPreviewProps {
  markdown: string;
  data: NdaFormData;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function SignatureRow({ label, sig, name, title, company, address, date }: {
  label: string;
  sig: string;
  name: string;
  title: string;
  company: string;
  address: string;
  date: string;
}) {
  return (
    <div className="border border-gray-300 rounded p-4 space-y-2">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="border-b border-gray-200 pb-2 min-h-[56px]">
        {sig ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sig} alt="Signature" className="h-12 object-contain" />
        ) : (
          <div className="h-12 flex items-end">
            <div className="w-full border-b border-gray-400" />
          </div>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {[
            ["Print Name", name],
            ["Title", title],
            ["Company", company],
            ["Notice Address", address],
            ["Date", date ? formatDate(date) : ""],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-gray-100 last:border-0">
              <td className="py-0.5 pr-2 text-xs text-gray-500 font-medium w-32">{k}</td>
              <td className="py-0.5 text-gray-800">{v || <span className="text-gray-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NdaPreview({ markdown, data, previewRef }: NdaPreviewProps) {
  return (
    <div
      ref={previewRef}
      className="bg-white px-10 py-8 font-serif text-gray-900 text-sm leading-relaxed"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-center mb-6 mt-2 text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-6 mb-2 text-gray-800 uppercase tracking-wide border-b border-gray-200 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-4 mb-1 text-gray-700">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 text-gray-800">{children}</p>,
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>
          ),
          li: ({ children }) => <li className="text-gray-800">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          hr: () => <hr className="my-6 border-gray-300" />,
          table: ({ children }) => (
            <table className="w-full border-collapse my-4 text-sm">{children}</table>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-3 py-2">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>

      {/* Signature blocks */}
      <div className="mt-8 border-t border-gray-300 pt-6">
        <h2 className="text-base font-bold mb-4 text-gray-800 uppercase tracking-wide">
          Signatures
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <SignatureRow
            label="Party 1"
            sig={data.party1Signature}
            name={data.party1Name}
            title={data.party1Title}
            company={data.party1Company}
            address={data.party1NoticeAddress}
            date={data.party1Date}
          />
          <SignatureRow
            label="Party 2"
            sig={data.party2Signature}
            name={data.party2Name}
            title={data.party2Title}
            company={data.party2Company}
            address={data.party2NoticeAddress}
            date={data.party2Date}
          />
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
        Common Paper Mutual Non-Disclosure Agreement Version 1.0 — free to use under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0
        </a>
      </div>
    </div>
  );
}
