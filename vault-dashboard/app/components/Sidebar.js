'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Database, Network, Beaker, Megaphone, ClipboardCheck, BookMarked, Layers, TerminalSquare, Bot, AlertTriangle, Radar, Cpu, Server } from 'lucide-react';

// Grouped by decision frequency, not org-chart: Command is the one-screen
// hub; Work is where kill/ship/approve judgments actually happen; Reference
// is janitorial/archive material visited on demand, never competing for
// attention. Quell folds into Marketing (its page redirects to
// /marketing/approvals); Assistant, Awareness, and Problems — the surviving
// features from the 2026-07-13 redesign — join Work/Reference, and Quinn
// returns as a Reference destination.
const GROUPS = [
  {
    label: 'Command',
    items: [
      { href: '/', label: 'Home', icon: Home },
      { href: '/fleet', label: 'Fleet', icon: Server },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/rad', label: 'RAD', icon: Layers, badgeKey: 'blocked' },
      { href: '/incubator', label: 'Incubator', icon: Beaker, badgeKey: 'active-exp' },
      { href: '/marketing/approvals', label: 'Marketing', icon: Megaphone, badgeKey: 'approvals' },
      { href: '/review', label: 'Ship Review', icon: ClipboardCheck, overdueBadge: true },
      { href: '/problems', label: 'Problems', icon: AlertTriangle },
      { href: '/assistant', label: 'Assistant', icon: Bot },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/vault', label: 'Vault', icon: Database },
      { href: '/decisions', label: 'Decisions', icon: BookMarked },
      { href: '/awareness', label: 'Awareness', icon: Radar },
      { href: '/quinn', label: 'Quinn', icon: Cpu },
      { href: '/prompts', label: 'Prompts', icon: TerminalSquare },
      { href: '/architecture', label: 'Architecture', icon: Network },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({});
  const [reviewOverdue, setReviewOverdue] = useState(false);

  useEffect(() => {
    fetch(`/api/command/decisions-pending?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const map = {};
        (d.items || []).forEach((item) => { map[item.key] = item.count; });
        setCounts(map);
      })
      .catch(() => {});
    fetch(`/api/review/agenda?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setReviewOverdue(!!d.overdue))
      .catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/revivr-logo.jpeg" alt="Revivr" className="sidebar-logo-img" />
        <span className="sidebar-subtitle">Online Operations</span>
      </div>

      <nav className="sidebar-nav">
        {GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '0.5rem' }}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : item.href === '/marketing/approvals'
                  ? pathname.startsWith('/marketing')
                  : pathname.startsWith(item.href);
              const count = item.badgeKey ? counts[item.badgeKey] : null;
              const showOverdue = item.overdueBadge && reviewOverdue;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-icon"><item.icon size={20} strokeWidth={2.5} /></span>
                  <span className="sidebar-label">{item.label}</span>
                  {count > 0 && <span className="sidebar-badge">{count}</span>}
                  {showOverdue && <span className="sidebar-badge sidebar-badge-alert">!</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-version">v2.0</span>
      </div>
    </aside>
  );
}
