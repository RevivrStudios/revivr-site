'use client';

export default function PlaceholderSection({ title, description }) {
  return (
    <div className="card placeholder-section">
      <div className="card-label">{title}</div>
      {description && <p className="card-subtitle">{description}</p>}
      <div className="placeholder-content">
        <span className="placeholder-icon">◇</span>
        <span>Coming soon</span>
      </div>
    </div>
  );
}
