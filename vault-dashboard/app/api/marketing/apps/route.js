import { NextResponse } from 'next/server';
import { listApps, upsertApp, deleteApp } from '@/app/lib/marketing';
import { logAction } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ success: true, apps: await listApps() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    const app = await upsertApp(body);
    await logAction({ source: 'quell', action: 'upsert-app', label: `Portfolio: ${app.name}`, success: true });
    return NextResponse.json({ success: true, app });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const ok = await deleteApp(id);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
