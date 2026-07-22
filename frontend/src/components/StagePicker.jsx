const STAGES = [
  { id: "t1", label: "1st trimester", short: "T1" },
  { id: "t2", label: "2nd trimester", short: "T2" },
  { id: "t3", label: "3rd trimester", short: "T3" },
  { id: "nursing", label: "Nursing", short: "Nurse" },
];

export default function StagePicker({ value, onChange }) {
  return (
    <fieldset className="stage-picker">
      <legend className="stage-picker__legend">Your stage</legend>
      <div className="stage-picker__row" role="radiogroup" aria-label="Pregnancy or nursing stage">
        {STAGES.map((stage) => {
          const selected = value === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`stage-chip${selected ? " is-selected" : ""}`}
              onClick={() => onChange(stage.id)}
            >
              <span className="stage-chip__short">{stage.short}</span>
              <span className="stage-chip__label">{stage.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
