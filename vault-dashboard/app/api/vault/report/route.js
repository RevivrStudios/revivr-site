import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const origin = request.nextUrl.origin;

    // Fetch all data sources in parallel
    const [healthRes, analyticsRes, driftRes, graphRes] = await Promise.all([
      fetch(`${origin}/api/vault/health`),
      fetch(`${origin}/api/vault/analytics`),
      fetch(`${origin}/api/vault/drift`),
      fetch(`${origin}/api/vault/graph`),
    ]);

    const health = await healthRes.json();
    const analytics = await analyticsRes.json();
    const drift = await driftRes.json();
    const graph = await graphRes.json();

    const now = new Date().toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });

    let report = `## Vault Diagnostics Report — ${now}\n\n`;
    report += `> Paste this report into any AI conversation (Antigravity, Claude, Codex) to get resolutions.\n\n`;

    // ── Health Summary
    report += `### 🏥 Health Summary\n`;
    report += `- **Health Score:** ${health.summary?.healthScore ?? 'N/A'}%\n`;
    report += `- **Total Documents:** ${health.summary?.totalFiles ?? analytics?.linkDensity?.totalFiles ?? 'N/A'}\n`;
    report += `- **Orphan Files:** ${health.summary?.orphanCount ?? health.orphans?.length ?? 0}\n`;
    report += `- **Decayed Documents:** ${health.summary?.decayedCount ?? health.decayed?.length ?? 0}\n`;
    report += `- **Link Density:** ${analytics?.linkDensity?.avgLinksPerDoc ?? 'N/A'} avg links/doc (${analytics?.linkDensity?.totalLinks ?? 0} total wikilinks)\n\n`;

    // ── Orphan Files
    if (health.orphans?.length > 0) {
      report += `### 🔴 Orphan Files (${health.orphans.length})\n`;
      report += `These files have zero incoming wikilinks and are disconnected from the knowledge graph.\n\n`;
      for (const f of health.orphans) {
        report += `- \`${f.path || f}\`\n`;
      }
      report += `\n**Resolution needed:** Add [[Wikilinks]] to these files from related documents, or delete them if obsolete.\n\n`;
    }

    // ── Decayed Documents
    if (health.decayed?.length > 0) {
      report += `### 🟠 Decayed Documents (${health.decayed.length})\n`;
      report += `These files have a \`last_verified\` date older than 60 days.\n\n`;
      for (const f of health.decayed) {
        report += `- \`${f.path || f}\` — last verified: ${f.lastVerified || 'unknown'}\n`;
      }
      report += `\n**Resolution needed:** Review each document, verify code samples still compile, and update the \`last_verified\` frontmatter field.\n\n`;
    }

    // ── API Drift Warnings
    if (drift.success && drift.watchlist?.length > 0) {
      report += `### ⚠️ API Drift Warnings (${drift.watchlist.length})\n`;
      report += `Baseline: ${drift.baseline?.lastMaintained} · Platform: ${drift.baseline?.platform}\n\n`;
      for (const item of drift.watchlist) {
        report += `#### ⚡ ${item.title}\n`;
        report += `- **Risk:** ${item.risk}\n`;
        if (item.currentRule) report += `- **Current Rule:** ${item.currentRule}\n`;
        if (item.affectedModules) report += `- **Affected Modules:** ${item.affectedModules}\n`;
        report += `\n`;
      }
      report += `**Resolution needed:** Check the latest Apple documentation for each risk area. If SDK behavior has changed, update the affected vault modules and log the drift in \`Trackers/SDK Version & API Drift Tracker.md\`.\n\n`;
    }

    // ── Documents in Draft
    const drafts = analytics?.prdPipeline?.draft || [];
    if (drafts.length > 0) {
      report += `### 📝 Documents in Draft (${drafts.length})\n`;
      report += `These documents have \`status: draft\` and may need completion or promotion.\n\n`;
      for (const d of drafts) {
        report += `- \`${d.path || d.name}\`\n`;
      }
      report += `\n**Resolution needed:** Review each draft. If the content is complete and verified, update the frontmatter to \`status: active\`. If incomplete, finish writing the document.\n\n`;
    }

    // ── Low Confidence Documents
    const lowConf = (analytics?.confidence || []).filter(d => d.score < 7);
    if (lowConf.length > 0) {
      report += `### 🔥 Low Confidence Documents (${lowConf.length})\n`;
      report += `These documents have a \`confidence_score\` below 7/10.\n\n`;
      for (const d of lowConf) {
        report += `- \`${d.path}\` — **${d.score}/10** (verified: ${d.lastVerified || 'never'})\n`;
      }
      report += `\n**Resolution needed:** Re-verify the code samples and technical claims in each document. Update \`confidence_score\` and \`last_verified\` in the frontmatter after review.\n\n`;
    } else {
      report += `### ✅ Confidence — All Clear\n`;
      report += `All scored documents are at 7/10 or above.\n\n`;
    }

    // ── Recent Activity
    const recent = analytics?.activity?.recentFiles?.slice(0, 5) || [];
    if (recent.length > 0) {
      report += `### 📅 Recent Activity (last 5 files touched)\n`;
      for (const f of recent) {
        report += `- \`${f.path}\` — ${f.daysAgo === 0 ? 'today' : f.daysAgo + 'd ago'}\n`;
      }
      report += `\n`;
    }

    // ── Graph Stats
    if (graph.success) {
      report += `### 🕸️ Knowledge Graph\n`;
      report += `- Nodes: ${graph.stats?.totalNodes ?? graph.nodes?.length ?? 'N/A'}\n`;
      report += `- Edges: ${graph.stats?.totalEdges ?? graph.links?.length ?? 'N/A'}\n`;
      report += `- Orphans: ${graph.stats?.orphanCount ?? 0}\n\n`;
    }

    report += `---\n*Generated by Vault Diagnostics Dashboard*\n`;

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
