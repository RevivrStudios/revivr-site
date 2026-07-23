'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const TABS = [
  { href: '/marketing/approvals', label: 'Approvals', badgeKey: 'approvals' },
  { href: '/marketing/apps', label: 'App Profiles' },
  { href: '/marketing/social', label: 'Social', badgeKey: 'social-drafts' },
  { href: '/marketing/report', label: 'Report' },
];

export default function MarketingTabs() {
  const pathname = usePathname();
  const [counts, setCounts] = useState({});

  // Same fan-in the sidebar badge uses — so when the Marketing badge reads N,
  // the tabs show exactly where those N items live (the sidebar total used to
  // point at /marketing/approvals even when every pending item was a social
  // draft, leaving the count apparently unaccounted for).
  useEffect(() => {
    fetch(`/api/command/decisions-pending?ts=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const map = {};
        (d.items || []).forEach((item) => { map[item.key] = item.count; });
        setCounts(map);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="tab-container">
      {TABS.map((tab) => {
        const count = tab.badgeKey ? counts[tab.badgeKey] : null;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-btn ${pathname.startsWith(tab.href) ? 'active' : ''}`}
          >
            {tab.label}
            {count > 0 && <span className="sidebar-badge" style={{ marginLeft: '0.45rem' }}>{count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
