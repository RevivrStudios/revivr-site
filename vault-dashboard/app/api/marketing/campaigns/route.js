import { NextResponse } from 'next/server';
import { listCampaigns, createCampaign, updateCampaign } from '@/app/lib/marketing';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ success: true, campaigns: await listCampaigns() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title) return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    const campaign = await createCampaign(body);
    await logAction({ source: 'quell', action: 'create-campaign', label: `Campaign ${campaign.id}: ${campaign.title}`, success: true });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const campaign = await updateCampaign(id, updates);
    if (!campaign) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAction({ source: 'quell', action: 'update-campaign', label: `Campaign ${id} → ${campaign.status}`, success: true });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
