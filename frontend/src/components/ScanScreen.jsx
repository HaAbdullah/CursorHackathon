import { ArrowRight, Barcode, ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import AppFooter from "./AppFooter.jsx";

const VERDICT_LABELS = {
  avoid: "Avoid",
  caution: "Caution",
  safe: "Looks fine",
  pending: "Researching",
};

export default function ScanScreen({ profile, recentChecks, onSubmit, onOpenRecent, onUpload }) {
  const [barcode, setBarcode] = useState("");
  const barcodeId = useId();

  function handleSubmit(event) {
    event.preventDefault();
    const value = barcode.trim();
    if (value) onSubmit(value);
  }

  return (
    <section className="screen scan-screen">
      <header className="brand-header">
        <div>
          <p className="brand-name">SafeScan</p>
          <p className="brand-subtitle">A clearer look at what is inside.</p>
        </div>
        <span className="trimester-pill">Trimester {profile.trimester}</span>
      </header>

      <div className="intro-block">
        <p className="eyebrow">Check a product</p>
        <h1>Is this safe for me?</h1>
        <p>Enter the barcode and we’ll check each ingredient against your profile.</p>
      </div>

      <form className="barcode-card" onSubmit={handleSubmit}>
        <label htmlFor={barcodeId}>Barcode</label>
        <div className="input-with-icon">
          <Barcode size={19} aria-hidden="true" />
          <input
            id={barcodeId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="737628064502"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
          />
        </div>
        <button className="button button-primary button-full" type="submit" disabled={!barcode.trim()}>
          Look up barcode <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="button button-secondary button-full" type="button" onClick={onUpload}>
          <ImagePlus size={18} aria-hidden="true" /> Upload photos instead
        </button>
      </form>

      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">Recent checks</h2>
          {recentChecks.length > 0 && <span>Last {recentChecks.length}</span>}
        </div>
        {recentChecks.length === 0 ? (
          <div className="empty-card">
            <p>Nothing checked yet. Scan a barcode or upload label photos to start.</p>
          </div>
        ) : (
          <ul className="recent-list">
            {recentChecks.map((item) => (
              <li key={item.scan_id}>
                <button type="button" className="recent-row" onClick={() => onOpenRecent(item.scan_id)}>
                  <span className={`recent-marker status-${item.verdict}`} aria-hidden="true" />
                  <span className="recent-main">
                    <strong>{item.product_name || "Product check"}</strong>
                    <small>{new Date(item.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small>
                  </span>
                  <span className={`recent-verdict text-${item.verdict}`}>
                    {VERDICT_LABELS[item.verdict] || "View"}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AppFooter />
    </section>
  );
}
