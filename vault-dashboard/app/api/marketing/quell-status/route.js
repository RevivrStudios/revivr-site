import fs from 'fs';
import {
  APPROVALS_DIR,
  noStoreHeaders,
  parseApprovalRecord,
  findMostRecentVaultChange,
  parsePublishLog,
  readRadPortfolio,
  PUBLISH_CHANNELS,
  PUBLISH_TYPES,
} from '../_shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let approvals = [];
    if (fs.existsSync(APPROVALS_DIR)) {
      approvals = fs
        .readdirSync(APPROVALS_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((file) => {
          const filePath = `${APPROVALS_DIR}/${file}`;
          const stat = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          return parseApprovalRecord(file, content, stat);
        });
    }

    const pendingApprovals = approvals.filter((a) => a.status === 'needs-einar-review').length;

    const decided = approvals.filter((a) => a.status !== 'needs-einar-review');
    decided.sort((a, b) => b.modifiedAt - a.modifiedAt);
    const mostRecentDecision = decided[0]
      ? { title: decided[0].title, app_id: decided[0].app_id, status: decided[0].status, decidedAt: decided[0].modifiedAt }
      : null;

    const mostRecentVaultChange = findMostRecentVaultChange();
    const publishLog = parsePublishLog();
    const radPortfolio = readRadPortfolio();

    return Response.json(
      {
        pendingApprovals,
        mostRecentDecision,
        mostRecentVaultChange,
        publishLog,
        radPortfolio,
        publishVocab: { channels: PUBLISH_CHANNELS, types: PUBLISH_TYPES },
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error('Error building Quell status:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
