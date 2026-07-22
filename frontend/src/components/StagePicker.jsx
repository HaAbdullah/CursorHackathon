const STAGES = [
  {
    id: "t1",
    label: "1st trimester",
    short: "T1",
    image: "/stages/stage-t1.png",
    alt: "Early pregnancy, first trimester",
  },
  {
    id: "t2",
    label: "2nd trimester",
    short: "T2",
    image: "/stages/stage-t2.png",
    alt: "Mid pregnancy, second trimester",
  },
  {
    id: "t3",
    label: "3rd trimester",
    short: "T3",
    image: "/stages/stage-t3.png",
    alt: "Late pregnancy, third trimester",
  },
  {
    id: "nursing",
    label: "Nursing",
    short: "Nurse",
    image: "/stages/stage-nursing.png",
    alt: "Nursing mother and infant",
  },
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
              aria-label={stage.label}
              className={`stage-chip${selected ? " is-selected" : ""}`}
              onClick={() => onChange(stage.id)}
            >
              <span className="stage-chip__media">
                <img src={stage.image} alt="" aria-hidden="true" />
              </span>
              <span className="stage-chip__text">
                <span className="stage-chip__short">{stage.short}</span>
                <span className="stage-chip__label">{stage.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
