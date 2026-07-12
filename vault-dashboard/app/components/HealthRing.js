'use client';

export default function HealthRing({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#43e28f' : score >= 50 ? '#ffb347' : '#ff5f58';

  return (
    <div className="health-ring">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle className="health-ring-bg" cx="45" cy="45" r={radius} />
        <circle
          className="health-ring-fill"
          cx="45" cy="45" r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color}44)` }}
        />
      </svg>
      <div className="health-ring-value" style={{ color }}>{score}%</div>
    </div>
  );
}
