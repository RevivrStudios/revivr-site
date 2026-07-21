'use client';

import Link from 'next/link';
import { X, ArrowUpRight, FolderOpen } from 'lucide-react';

const OWNER_LABEL = { quinn: 'Quinn (Operations)', quell: 'Quell (Marketing)', shared: 'Quinn + Quell (shared)' };
const TIER_LABEL = { core: 'Core', agent: 'Agent', domain: 'Domain', project: 'Project', accessibility: 'Mission', external: 'External' };

function Row({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div className="arch-panel-row">
      <span className="arch-panel-key">{label}</span>
      <span className="arch-panel-val">{children}</span>
    </div>
  );
}

export default function SidePanel({ node, connected, onSelect, onClose }) {
  const ownerClass = node.owner ? `owner-${node.owner}` : `tier-${node.tier}`;
  return (
    <aside className="arch-panel">
      <div className="arch-panel-head">
        <div>
          <div className={`arch-panel-badge ${ownerClass}`}>{OWNER_LABEL[node.owner] || TIER_LABEL[node.tier]}</div>
          <h2 className="arch-panel-title">{node.label}</h2>
        </div>
        <button className="arch-panel-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      {node.description && <p className="arch-panel-desc">{node.description}</p>}

      {node.responsibilities?.length > 0 && (
        <ul className="arch-panel-resp">
          {node.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      <div className="arch-panel-meta">
        <Row label="Status">{node.status && <span className={`arch-status s-${node.status}`}>{node.status}</span>}</Row>
        <Row label="Platform">{node.platform}</Row>
        <Row label="Next milestone">{node.nextMilestone}</Row>
        <Row label="Ops owner">{node.opsOwner && OWNER_LABEL[node.opsOwner]}</Row>
        <Row label="Marketing owner">{node.marketingOwner && OWNER_LABEL[node.marketingOwner]}</Row>
        <Row label="Vault path">{node.vaultPath && <code className="arch-panel-code"><FolderOpen size={11} /> {node.vaultPath}</code>}</Row>
        <Row label="Dashboard">
          {node.opsSection && <Link href={node.opsSection} className="arch-panel-link">{node.opsSection} <ArrowUpRight size={12} /></Link>}
        </Row>
      </div>

      {connected.length > 0 && (
        <div className="arch-panel-connected">
          <div className="arch-panel-key">Connected</div>
          <div className="arch-panel-chips">
            {connected.map((c) => (
              <button key={c.id} className={`arch-conn-chip ${c.owner ? `owner-${c.owner}` : `tier-${c.tier}`}`} onClick={() => onSelect(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
