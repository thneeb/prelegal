"use client";

interface TabSwitcherProps {
  activeTab: "chat" | "form";
  onTabChange: (tab: "chat" | "form") => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      {(["chat", "form"] as const).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
              isActive ? "font-semibold border-b-2" : "border-b-2 border-transparent"
            }`}
            style={
              isActive
                ? { color: "#032147", borderColor: "#ecad0a" }
                : { color: "#888888" }
            }
          >
            {tab === "chat" ? "Chat" : "Form"}
          </button>
        );
      })}
    </div>
  );
}
