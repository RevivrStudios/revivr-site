import { NextResponse } from 'next/server';
import { listResources, upsertResource, deleteResource, expiryInfo } from '@/app/lib/resources';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const resources = (await listResources()).map((r) => ({ ...r, ...expiryInfo(r) }));
    return NextResponse.json({ success: true, resources });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    const resource = await upsertResource(body);
    await logAction({ source: 'resources', action: 'upsert', label: `Resource: ${resource.name} (${resource.type})`, success: true });
    return NextResponse.json({ success: true, resource });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const ok = await deleteResource(id);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
