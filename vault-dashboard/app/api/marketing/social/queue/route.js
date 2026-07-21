import { listSocialQueueDrafts, noStoreHeaders } from '../../_shared';
import { xAccountReady } from '../_x';

const API_PLATFORMS = ['x-personal', 'x-company'];

// Lists all Social Queue drafts, newest first, each annotated with whether
// Approve & Post is actually available right now — the plan's "token-absent
// paths degrade to Copy" rule lives here so the UI never has to guess.
export async function GET() {
  const drafts = listSocialQueueDrafts().map((d) => ({
    ...d,
    canApprovePost: API_PLATFORMS.includes(d.platform) && xAccountReady(d.platform),
  }));
  return Response.json({ drafts }, { headers: noStoreHeaders });
}
