import { NextResponse } from 'next/server';
import { PROJECT_REGISTRY_FILE } from '@/app/lib/config';
import { safeReadFile } from '@/app/lib/vaultFs';
import { parseProjectRegistry } from '@/app/lib/assistant/tools';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const registry = await safeReadFile(PROJECT_REGISTRY_FILE);
    return NextResponse.json({ success: true, projects: registry ? parseProjectRegistry(registry) : [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
