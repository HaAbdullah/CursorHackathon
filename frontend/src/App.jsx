import { useState } from "react";
import ScanView from "./components/ScanView.jsx";
import VerdictView from "./components/VerdictView.jsx";
import { scanProduct } from "./lib/api.js";

export default function App() {
  const [stage, setStage] = useState("t1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [lastBarcode, setLastBarcode] = useState("");

  async function runScan(barcode, nextStage = stage) {
    setBusy(true);
    setError("");
    try {
      const data = await scanProduct({ barcode, stage: nextStage });
      setLastBarcode(barcode);
      setResult(data);
    } catch (err) {
      setError(err?.message || "Scan failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStageChangeFromVerdict(nextStage) {
    setStage(nextStage);
    if (lastBarcode) {
      await runScan(lastBarcode, nextStage);
    }
  }

  return (
    <div className="app-shell">
      <div className="app-atmosphere" aria-hidden="true" />
      <main className="app-main">
        {result ? (
          <VerdictView
            result={result}
            onRescan={() => {
              setResult(null);
              setError("");
            }}
            onStageChange={handleStageChangeFromVerdict}
          />
        ) : (
          <ScanView
            stage={stage}
            onStageChange={setStage}
            onScan={runScan}
            busy={busy}
          />
        )}
        {error ? <p className="app-error">{error}</p> : null}
      </main>
    </div>
  );
}
