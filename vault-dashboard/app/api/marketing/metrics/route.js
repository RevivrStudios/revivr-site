import fs from 'fs';
import path from 'path';
import { noStoreHeaders } from '../_shared';

export const dynamic = 'force-dynamic';

// Serves the App Store Connect metrics cache written by asc-metrics-collector
// (daily 06:30 launchd job — sales units/proceeds + analytics installs per
// app). Quell's ops digest and weekly report probe this endpoint; before the
// first collector run it answers pending:true rather than 404 so consumers
// can distinguish "not wired" from "no data yet".
const METRICS_FILE = path.join(process.cwd(), 'data', 'marketing', 'metrics', 'summary.json');

export async function GET() {
  try {
    const raw = fs.readFileSync(METRICS_FILE, 'utf8');
    const summary = JSON.parse(raw);
    return Response.json({ success: true, pending: false, ...summary }, { headers: noStoreHeaders });
  } catch (error) {
    return Response.json(
      {
        success: true,
        pending: true,
        note: 'metrics collector has not produced a cache yet (runs daily at 06:30 via com.revivr.asc-metrics-collector)',
      },
      { headers: noStoreHeaders }
    );
  }
}
