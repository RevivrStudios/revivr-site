import fs from 'fs';
import { APPROVALS_DIR, noStoreHeaders, parseApprovalRecord } from '../_shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(APPROVALS_DIR)) {
      return Response.json({ approvals: [] }, { headers: noStoreHeaders });
    }

    const files = fs.readdirSync(APPROVALS_DIR).filter((f) => f.endsWith('.md'));
    const approvals = files.map((file) => {
      const filePath = `${APPROVALS_DIR}/${file}`;
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return parseApprovalRecord(file, content, stat);
    });

    approvals.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));

    return Response.json({ approvals }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error reading approvals:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
