import { redirect } from 'next/navigation';

// Quell's live status (approvals/RAD/publish-log) moved to
// /marketing/approvals, and its prompt library moved to /prompts#quell,
// as part of the command-deck redesign's sidebar consolidation (Phase 5).
export default function QuellRedirect() {
  redirect('/marketing/approvals');
}
