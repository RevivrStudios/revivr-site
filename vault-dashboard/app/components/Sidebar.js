'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Database, Cpu, Sparkles, TerminalSquare, Network, Beaker, Bot, AlertTriangle, Radar } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/assistant', label: 'Assistant', icon: Bot },
  { href: '/problems', label: 'Problems', icon: AlertTriangle },
  { href: '/awareness', label: 'Awareness', icon: Radar },
  { href: '/vault', label: 'Vault', icon: Database },
  { href: '/incubator', label: 'Incubator', icon: Beaker },
  { href: '/quinn', label: 'Quinn', icon: Cpu },
  { href: '/quell', label: 'Quell', icon: Sparkles },
  { href: '/prompts', label: 'Prompts', icon: TerminalSquare },
  { href: '/architecture', label: 'Architecture', icon: Network },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/revivr-logo.jpeg" alt="Revivr" className="sidebar-logo-img" />
        <span className="sidebar-subtitle">Online Operations</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon"><item.icon size={20} strokeWidth={2.5} /></span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-version">v2.0</span>
      </div>
    </aside>
  );
}
