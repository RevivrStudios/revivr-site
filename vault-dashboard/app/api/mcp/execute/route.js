import { NextResponse } from 'next/server';
import { exec } from 'child_process';

import { VAULT_PATH, VECTOR_MCP_DIR, TURBOVAULT_BINARY } from '@/app/lib/config';
import { logAction } from '@/app/lib/actionlog';

const ALLOWED_ACTIONS = {
  rebuild_vector: {
    label: 'Rebuild Vector Database',
    command: `cd ${VECTOR_MCP_DIR} && source venv_py312/bin/activate && python ingest.py 2>&1`,
    dangerous: true,
  },
  post_sprint_extraction: {
    label: 'Post-Sprint Extraction (Full Re-Index)',
    command: `rm -rf ${VECTOR_MCP_DIR}/chroma_db && cd ${VECTOR_MCP_DIR} && source venv_py312/bin/activate && python ingest.py 2>&1`,
    dangerous: true,
  },
  suggest_links_bulk: {
    label: 'Turbovault Link Audit (broken links, dead-ends, isolated clusters)',
    // Real audit via the turbovault MCP tools — replaces the old command that
    // only echoed the initialize handshake (a smoke test, not an audit).
    // Absolute node path: the server runs under launchd with a minimal PATH.
    command: `/opt/homebrew/opt/node@24/bin/node "${process.cwd()}/turbovault-link-audit.js" "${VAULT_PATH}" 2>&1`,
    dangerous: false,
  },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action || !ALLOWED_ACTIONS[action]) {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}. Allowed: ${Object.keys(ALLOWED_ACTIONS).join(', ')}` },
        { status: 400 }
      );
    }

    const task = ALLOWED_ACTIONS[action];

    return new Promise((resolve) => {
      exec(task.command, { timeout: 120000, shell: '/bin/zsh' }, async (error, stdout, stderr) => {
        await logAction({
          source: 'mcp-execute',
          action,
          label: task.label,
          success: !error,
          detail: error ? error.message : (stdout || '').slice(-500),
        });
        resolve(NextResponse.json({
          success: !error,
          action: action,
          label: task.label,
          timestamp: new Date().toISOString(),
          output: stdout || '',
          error: error ? error.message : null,
          stderr: stderr || '',
        }));
      });
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
