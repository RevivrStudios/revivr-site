import { NextResponse } from 'next/server';
import { computeVitals, writeVitalsCache, getApps, provisionAnalytics } from '@/app/lib/ascAnalytics';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Populate the Business Vitals cache from the `asc` CLI. Optionally provision
// the Analytics Reports API first ({ provision: true }) — a one-time enable per
// app that lets Apple start generating the funnel reports. Provisioning is a
// real account action, so it only runs when explicitly requested.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let provisionResult = null;

    if (body.provision) {
      const apps = await getApps();
      const results = [];
      for (const app of apps) {
        try {
          results.push(await provisionAnalytics(app.id));
        } catch (err) {
          results.push({ appId: app.id, provisioned: false, error: err.message });
        }
      }
      provisionResult = results;
      await logAction({
        source: 'business-vitals',
        action: 'provision-analytics',
        label: 'Enabled App Store analytics reporting',
        success: true,
        detail: `${results.filter((r) => r.created).length} app(s) newly provisioned`,
      });
    }

    const vitals = await computeVitals();
    await writeVitalsCache(vitals);
    await logAction({
      source: 'business-vitals',
      action: 'sync',
      label: 'Synced Business Vitals from App Store Connect',
      success: vitals.overall !== 'error',
      detail: `overall: ${vitals.overall}`,
    });

    return NextResponse.json({ status: 'ok', vitals, provisionResult });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
