import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const assets = JSON.parse(await readFile(new URL('./runtime-assets.json', import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

for (const asset of assets) {
  const target = resolve(root, asset.path);
  if (!target.startsWith(`${root}/public/`) || !asset.url.startsWith('https://revivr-studios.web.app/')) {
    throw new Error(`Unexpected asset location: ${asset.path}`);
  }
  let local;
  try { local = await readFile(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (local) {
    if (sha256(local) !== asset.sha256) throw new Error(`Local asset changed; review manifest: ${asset.path}`);
    continue;
  }
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${asset.path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== asset.sha256) throw new Error(`Published asset checksum mismatch: ${asset.path}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  console.log(`Restored ${asset.path}`);
}
console.log(`Verified ${assets.length} runtime assets.`);
