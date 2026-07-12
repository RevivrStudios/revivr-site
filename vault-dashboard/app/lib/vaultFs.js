import { readFile, mkdir } from 'fs/promises';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// iCloud Drive files can transiently fail with EAGAIN while downloading;
// retry with backoff before giving up. Returns '' on failure so callers
// render empty state instead of crashing.
export async function safeReadFile(filePath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (err) {
      if (err.code === 'ENOENT') return '';
      if (err.code === 'EAGAIN' || err.message.includes('-11')) {
        await wait(500 * (i + 1));
      } else {
        throw err;
      }
    }
  }
  console.warn(`[Vault] Giving up on iCloud download for ${filePath} after ${retries} attempts.`);
  return '';
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}
