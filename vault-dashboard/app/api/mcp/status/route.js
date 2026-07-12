import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { access, constants } from 'fs/promises';

import { TURBOVAULT_BINARY, VECTOR_MCP_DIR, CHROMA_DB_PATH } from '@/app/lib/config';

async function checkFileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkExecutable(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function getChromaStats() {
  try {
    const fs = require('fs');
    if (!fs.existsSync(CHROMA_DB_PATH)) {
      return { exists: false, fileCount: 0 };
    }
    const output = execSync(`find "${CHROMA_DB_PATH}" -type f | wc -l`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    return { exists: true, fileCount: parseInt(output) };
  } catch {
    return { exists: false, fileCount: 0 };
  }
}

function getVectorMCPStatus() {
  try {
    const serverExists = require('fs').existsSync(`${VECTOR_MCP_DIR}/server.py`);
    const venvExists = require('fs').existsSync(`${VECTOR_MCP_DIR}/venv_py312`);
    return { serverExists, venvExists };
  } catch {
    return { serverExists: false, venvExists: false };
  }
}

export async function GET() {
  try {
    const turbovaultExists = await checkFileExists(TURBOVAULT_BINARY);
    const turbovaultExecutable = await checkExecutable(TURBOVAULT_BINARY);
    const chromaStats = getChromaStats();
    const vectorMCP = getVectorMCPStatus();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      engines: {
        turbovault: {
          name: 'Turbovault Link Engine',
          status: turbovaultExists && turbovaultExecutable ? 'online' : 'offline',
          binaryExists: turbovaultExists,
          executable: turbovaultExecutable,
          path: TURBOVAULT_BINARY,
        },
        vectorMCP: {
          name: 'Obsidian Vector MCP',
          status: vectorMCP.serverExists && vectorMCP.venvExists ? 'ready' : 'offline',
          serverExists: vectorMCP.serverExists,
          venvExists: vectorMCP.venvExists,
          path: VECTOR_MCP_DIR,
        },
        chromaDB: {
          name: 'ChromaDB Vector Store',
          status: chromaStats.exists ? 'indexed' : 'empty',
          indexedFiles: chromaStats.fileCount,
          path: CHROMA_DB_PATH,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
