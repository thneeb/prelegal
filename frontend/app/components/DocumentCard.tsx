"use client";

interface DocumentCardProps {
  id: string;
  name: string;
  description: string;
  onSelect: (id: string) => void;
}

export default function DocumentCard({ id, name, description, onSelect }: DocumentCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="text-left w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 group"
    >
      <h3
        className="text-sm font-semibold mb-1 group-hover:underline"
        style={{ color: "#032147" }}
      >
        {name}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "#888888" }}>
        {description}
      </p>
    </button>
  );
}
