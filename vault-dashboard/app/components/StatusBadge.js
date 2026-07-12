'use client';

export default function StatusBadge({ status }) {
  const isOnline = ['online', 'ready', 'indexed'].includes(status);
  return (
    <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
      <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
      {status}
    </span>
  );
}
