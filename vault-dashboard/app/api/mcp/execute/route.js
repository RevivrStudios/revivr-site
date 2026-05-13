import { NextResponse } from 'next/server';
import { exec } from 'child_process';

const VAULT_PATH = process.env.VAULT_PATH || '/Users/einarjohnson/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/VisionAppDev';
const VECTOR_MCP_DIR = process.env.VECTOR_MCP_DIR || '/Users/einarjohnson/.gemini/antigravity/mcp/obsidian-vector-mcp';
const TURBOVAULT_BINARY = process.env.TURBOVAULT_BINARY || '/Users/einarjohnson/.gemini/antigravity/mcp/turbovault-mcp/turbovault';

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
    label: 'Bulk Turbovault Link Audit',
    command: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"dashboard","version":"1.0"}}}' | ${TURBOVAULT_BINARY} --vault "${VAULT_PATH}" --profile production 2>&1 | head -5`,
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
      exec(task.command, { timeout: 120000, shell: '/bin/zsh' }, (error, stdout, stderr) => {
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
