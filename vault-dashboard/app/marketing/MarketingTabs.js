'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/marketing/approvals', label: 'Approvals' },
  { href: '/marketing/apps', label: 'App Profiles' },
  { href: '/marketing/social', label: 'Social' },
  { href: '/marketing/report', label: 'Report' },
];

export default function MarketingTabs() {
  const pathname = usePathname();
  return (
    <div className="tab-container">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab-btn ${pathname.startsWith(tab.href) ? 'active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
