const VERDICT_COPY = {
  safe: { word: "Safe", tone: "safe" },
  caution: { word: "Caution", tone: "caution" },
  avoid: { word: "Avoid", tone: "avoid" },
  unknown: { word: "Unknown", tone: "unknown" },
};

const STAGE_LABELS = {
  t1: "1st trimester",
  t2: "2nd trimester",
  t3: "3rd trimester",
  nursing: "Nursing",
};

export default function VerdictView({ result, onRescan, onStageChange }) {
  const meta = VERDICT_COPY[result.verdict] || VERDICT_COPY.unknown;

  return (
    <section className="panel verdict-panel" aria-live="polite">
      <button type="button" className="text-link" onClick={onRescan}>
        ← Scan another
      </button>

      <div className={`verdict-stamp verdict-stamp--${meta.tone}`}>
        <p className="verdict-stamp__eyebrow">
          For {STAGE_LABELS[result.stage] || result.stage}
        </p>
        <h1 className="verdict-stamp__word">{meta.word}</h1>
        <p className="verdict-stamp__summary">{result.summary}</p>
      </div>

      <div className="product-meta">
        <p className="product-meta__name">{result.name}</p>
        {result.brand ? <p className="product-meta__brand">{result.brand}</p> : null}
        <p className="product-meta__code">Barcode {result.barcode}</p>
        {result.demo ? (
          <p className="product-meta__demo">Demo data — swap in live safety APIs when backend is ready</p>
        ) : null}
      </div>

      <section className="reason-block">
        <h2>Why</h2>
        <ol className="reason-list">
          {(result.reasons || []).map((reason, index) => (
            <li key={index} style={{ "--i": index }}>
              {reason}
            </li>
          ))}
        </ol>
      </section>

      {result.ingredients?.length ? (
        <section className="ingredient-block">
          <h2>Ingredients checked</h2>
          <ul className="ingredient-list">
            {result.ingredients.map((item) => (
              <li key={item.name} className={`ingredient ingredient--${item.risk}`}>
                <span>{item.name}</span>
                <span className="ingredient__risk">{item.risk}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.sources?.length ? (
        <section className="source-block">
          <h2>Sources</h2>
          <p className="source-line">{result.sources.join(" · ")}</p>
        </section>
      ) : null}

      <p className="disclaimer">
        Expecta summarizes publicly discussed safety signals for education at the shelf. It is not medical advice.
        When a medicine or high-risk ingredient is involved, confirm with your clinician.
      </p>

      <div className="verdict-actions">
        <button type="button" className="btn btn-primary" onClick={onRescan}>
          Scan another product
        </button>
        {result.stage !== "nursing" ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onStageChange("nursing")}
          >
            Recheck for nursing
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onStageChange("t1")}
          >
            Recheck for pregnancy
          </button>
        )}
      </div>
    </section>
  );
}
