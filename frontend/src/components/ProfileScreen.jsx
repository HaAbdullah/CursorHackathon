import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import AppFooter from "./AppFooter.jsx";

const TRIMESTERS = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
];

const CONDITIONS = [
  { value: "gestational_diabetes", label: "Gestational diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "anemia", label: "Anemia" },
  { value: "thyroid", label: "Thyroid condition" },
];

export default function ProfileScreen({ profile, onChange }) {
  const [allergies, setAllergies] = useState(profile.allergies.join(", "));
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);
  const allergiesId = useId();

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  function update(next) {
    onChange(next);
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1400);
  }

  function toggleCondition(value) {
    const selected = profile.conditions.includes(value);
    update({
      ...profile,
      conditions: selected
        ? profile.conditions.filter((condition) => condition !== value)
        : [...profile.conditions, value],
    });
  }

  function changeAllergies(value) {
    setAllergies(value);
    update({
      ...profile,
      allergies: value.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <section className="screen profile-screen">
      <header className="screen-header profile-header">
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>Make each check personal</h1>
        </div>
        <span className={`saved-hint${saved ? " is-visible" : ""}`} role="status">
          <Check size={14} aria-hidden="true" /> Saved
        </span>
        <p>These personalize every report you get.</p>
      </header>

      <section className="profile-group" aria-labelledby="trimester-title">
        <div className="field-heading">
          <h2 id="trimester-title">Trimester</h2>
          <span>Required</span>
        </div>
        <div className="segmented-control" role="radiogroup" aria-label="Trimester">
          {TRIMESTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={profile.trimester === item.value}
              className={profile.trimester === item.value ? "is-selected" : ""}
              onClick={() => update({ ...profile, trimester: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="profile-group" aria-labelledby="conditions-title">
        <div className="field-heading">
          <h2 id="conditions-title">Health conditions</h2>
          <span>Select any</span>
        </div>
        <div className="condition-chips">
          {CONDITIONS.map((condition) => {
            const selected = profile.conditions.includes(condition.value);
            return (
              <button
                key={condition.value}
                type="button"
                className={selected ? "is-selected" : ""}
                aria-pressed={selected}
                onClick={() => toggleCondition(condition.value)}
              >
                {selected && <Check size={15} aria-hidden="true" />}
                {condition.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="profile-group">
        <div className="field-heading">
          <label htmlFor={allergiesId}>Allergies</label>
          <span>Optional</span>
        </div>
        <input
          id={allergiesId}
          className="text-input"
          value={allergies}
          onChange={(event) => changeAllergies(event.target.value)}
          placeholder="e.g. peanuts, lanolin"
        />
        <p className="field-help">Separate multiple allergies with commas.</p>
      </section>
      <AppFooter />
    </section>
  );
}
