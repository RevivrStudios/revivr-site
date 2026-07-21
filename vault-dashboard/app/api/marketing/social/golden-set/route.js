import { countGoldenSetEntries, GOLDEN_SET_MINIMUM, noStoreHeaders } from '../../_shared';

export async function GET() {
  const count = countGoldenSetEntries();
  return Response.json({ count, minimum: GOLDEN_SET_MINIMUM, ready: count >= GOLDEN_SET_MINIMUM }, { headers: noStoreHeaders });
}
