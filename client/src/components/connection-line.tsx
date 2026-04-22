interface ConnectionLineProps {
  strength: number;
}

export function ConnectionLine({ strength }: ConnectionLineProps) {
  const clampedStrength = Math.max(0, Math.min(1, strength));
  const opacity = clampedStrength < 0.01 ? 0.06 : Math.max(0.06, clampedStrength);
  const width = Math.max(1, Math.min(4, clampedStrength * 5));
  const grayBase = "rgb(128,128,128)";

  return (
    <div className="flex items-center justify-center w-12 shrink-0" data-testid="connection-line">
      <svg width="48" height="24" viewBox="0 0 48 24">
        <defs>
          <linearGradient id={`grad-${Math.round(clampedStrength * 1000)}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={grayBase} stopOpacity={opacity * 0.2} />
            <stop offset="50%" stopColor={grayBase} stopOpacity={opacity} />
            <stop offset="100%" stopColor={grayBase} stopOpacity={opacity * 0.2} />
          </linearGradient>
        </defs>
        <line
          x1="2"
          y1="12"
          x2="46"
          y2="12"
          stroke={`url(#grad-${Math.round(clampedStrength * 1000)})`}
          strokeWidth={width}
          strokeLinecap="round"
        />
        <circle cx="4" cy="12" r="2.5" fill={grayBase} fillOpacity={opacity * 0.5} />
        <circle cx="44" cy="12" r="2.5" fill={grayBase} fillOpacity={opacity * 0.5} />
      </svg>
    </div>
  );
}
