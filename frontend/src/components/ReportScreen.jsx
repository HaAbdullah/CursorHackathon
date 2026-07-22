import { AlertCircle, CheckCircle2, FlaskConical, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import AppFooter from "./AppFooter.jsx";

const VERDICTS = {
  avoid: { word: "Avoid", label: "Avoid" },
  caution: { word: "Caution", label: "Caution" },
  safe: { word: "Looks fine", label: "Safe" },
  pending: { word: "Still checking", label: "Pending" },
};

const STATUS_LABELS = {
  avoid: "Avoid",
  caution: "Caution",
  safe: "Safe",
  pending: "Pending",
};

function ProgressPipeline() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const first = window.setTimeout(() => setStep(1), 650);
    const second = window.setTimeout(() => setStep(2), 1500);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, []);

  const steps = ["Reading label", "Checking database", "Researching unknowns"];
  return (
    <div className="pipeline" aria-live="polite" aria-label={`Current step: ${steps[step]}`}>
      <div className="pipeline-line" aria-hidden="true" />
      {steps.map((label, index) => (
        <div className={`pipeline-step${index <= step ? " is-active" : ""}`} key={label}>
          <span>{index < step ? <CheckCircle2 size={16} /> : index + 1}</span>
          <p>{label}</p>
        </div>
      ))}
    </div>
  );
}

function SubmittingReport() {
  return (
    <section className="report-state report-loading">
      <div className="research-icon"><FlaskConical size={25} aria-hidden="true" /></div>
      <p className="eyebrow">Building your report</p>
      <h1>Checking every ingredient</h1>
      <p>This can take a little longer when an ingredient needs fresh research.</p>
      <ProgressPipeline />
    </section>
  );
}

function IngredientRow({ ingredient }) {
  const rawIsDifferent = ingredient.raw && ingredient.raw.trim().toLowerCase() !== ingredient.name.trim().toLowerCase();
  const source = ingredient.source === "agent"
    ? "agent verified"
    : ingredient.source === "pending"
      ? "researching…"
      : "database";

  return (
    <li className={`ingredient-row ingredient-${ingredient.status}`}>
      <span className="rail-marker" aria-hidden="true" />
      <div className="ingredient-topline">
        <h3>{ingredient.name}</h3>
        <span className={`status-label text-${ingredient.status}`}>{STATUS_LABELS[ingredient.status]}</span>
      </div>
      {rawIsDifferent && <p className="ingredient-raw">Listed as: {ingredient.raw}</p>}
      {ingredient.why && <p className="ingredient-why">{ingredient.why}</p>}
      {ingredient.max_amount && (
        <p className="ingredient-limit"><strong>Amount guidance:</strong> {ingredient.max_amount}</p>
      )}
      <span className={`source-tag source-${ingredient.source}`}>{source}</span>
    </li>
  );
}

function FinishedReport({ scan }) {
  const report = scan.report;
  const verdict = VERDICTS[report.verdict] || VERDICTS.pending;
  const personalNotes = report.ingredients.filter((ingredient) => ingredient.personal_note);
  const isResearching = scan.status === "partial" || report.pending_count > 0;

  return (
    <>
      <section className={`verdict-banner verdict-${report.verdict}`} aria-labelledby="verdict-word">
        <p className="verdict-kicker">Ingredient safety report</p>
        <h1 id="verdict-word">{verdict.word}</h1>
        <p className="verdict-product">{report.product_name || "Product name unavailable"}</p>
        <span className="visually-hidden">Overall verdict: {verdict.label}</span>
      </section>

      <section className="summary-block" aria-live="polite">
        <h2>What this means</h2>
        {report.summary ? (
          <p>{report.summary}</p>
        ) : (
          <div className="summary-skeleton" aria-label="Summary is still being researched">
            <span /><span />
          </div>
        )}
      </section>

      {personalNotes.length > 0 && (
        <section className="personal-section" aria-labelledby="personal-title">
          <h2 id="personal-title">Because of your profile</h2>
          <div className="personal-callouts">
            {personalNotes.map((ingredient) => (
              <div className="personal-callout" key={`${ingredient.name}-${ingredient.personal_note}`}>
                <AlertCircle size={18} aria-hidden="true" />
                <p><strong>{ingredient.name}</strong><span>{ingredient.personal_note}</span></p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ingredients-section" aria-labelledby="ingredients-title">
        <div className="section-heading">
          <h2 id="ingredients-title">Ingredients</h2>
          <span>{report.ingredients.length} checked</span>
        </div>
        <ul className="specimen-rail">
          {report.ingredients.map((ingredient, index) => (
            <IngredientRow ingredient={ingredient} key={`${ingredient.name}-${index}`} />
          ))}
        </ul>
      </section>

      {isResearching && (
        <div className="research-footer" role="status">
          <span className="research-dot" aria-hidden="true" />
          Researching {report.pending_count} {report.pending_count === 1 ? "ingredient" : "ingredients"}…
        </div>
      )}
    </>
  );
}

export default function ReportScreen({ scan, onTryAgain }) {
  return (
    <section className="screen report-screen">
      {!scan && (
        <div className="report-state report-empty">
          <ClipboardEmpty />
          <h1>No report yet</h1>
          <p>Scan a barcode or upload label photos to see a report here.</p>
        </div>
      )}
      {scan?.status === "submitting" && <SubmittingReport />}
      {scan?.status === "processing" && <SubmittingReport />}
      {scan?.status === "failed" && (
        <div className="report-state report-failed" role="alert">
          <div className="error-icon"><AlertCircle size={25} aria-hidden="true" /></div>
          <p className="eyebrow">We could not finish this check</p>
          <h1>Try a clearer input</h1>
          <p>{scan.error || "Couldn't read the label. Try a closer photo of the ingredients panel."}</p>
          <button type="button" className="button button-primary" onClick={onTryAgain}>
            <RotateCcw size={17} aria-hidden="true" /> Try again
          </button>
        </div>
      )}
      {["partial", "complete"].includes(scan?.status) && scan.report && <FinishedReport scan={scan} />}
      <AppFooter />
    </section>
  );
}

function ClipboardEmpty() {
  return <div className="empty-report-icon"><FlaskConical size={25} aria-hidden="true" /></div>;
}
