import { ClipboardList, ScanLine, Upload, UserRound } from "lucide-react";

const ITEMS = [
  { id: "scan", label: "Scan", Icon: ScanLine },
  { id: "upload", label: "Upload", Icon: Upload },
  { id: "report", label: "Report", Icon: ClipboardList },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`nav-item${activeTab === id ? " is-active" : ""}`}
          aria-current={activeTab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
          <span className="nav-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}
