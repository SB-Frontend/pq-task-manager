export interface ProgressBarProps {
  /** 0-100. Values outside the range, NaN and Infinity are clamped. */
  value: number;
  label?: string;
  showValue?: boolean;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function ProgressBar({
  value,
  label = "Progress",
  showValue = false,
}: ProgressBarProps) {
  const percent = clamp(value);

  return (
    <div className="space-y-1.5">
      {showValue && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className="font-medium text-foreground">{percent}%</span>
        </div>
      )}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}%`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
