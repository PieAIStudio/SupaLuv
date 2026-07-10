/** Shared volume slider row for player audio settings. */

export function VolumeRow({
  label,
  hint,
  value,
  testId,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly value: number;
  readonly testId: string;
  readonly disabled?: boolean;
  readonly onChange: (next: number) => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <label className="settings-volume">
      <span className="settings-volume-label">
        {label} {percent}%
      </span>
      {hint ? <span className="settings-volume-hint">{hint}</span> : null}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        data-testid={testId}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}
