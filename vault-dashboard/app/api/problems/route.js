import { NextResponse } from 'next/server';
import { listProblems, createProblem, updateProblem } from '@/app/lib/problems';
import { logAction } from '@/app/lib/actionlog';
import { syncBlockersToBoard } from '@/app/lib/problemsSync';

export const dynamic = 'force-dynamic';

// Mirror blocked tickets to the Operating Board after a mutation. Non-fatal:
// a sync failure must never fail the ticket operation itself.
async function mirrorBlockers() {
  try { await syncBlockersToBoard(); } catch { /* logged inside; ignore here */ }
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, problems: await listProblems() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title) return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    const problem = await createProblem(body);
    await logAction({ source: 'problems', action: 'create', label: `Problem ${problem.id}: ${problem.title}`, success: true });
    await mirrorBlockers();
    return NextResponse.json({ success: true, problem });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const problem = await updateProblem(id, updates);
    if (!problem) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await logAction({ source: 'problems', action: 'update', label: `Problem ${id} → ${problem.status}`, success: true });
    await mirrorBlockers();
    return NextResponse.json({ success: true, problem });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
