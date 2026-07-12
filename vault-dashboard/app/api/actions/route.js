import { NextResponse } from 'next/server';
import { readActions } from '@/app/lib/actionlog';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50', 10);
    return NextResponse.json({ success: true, actions: await readActions(limit) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
