import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { RESOURCES_FILE } from '@/app/lib/config';
import { ensureDir } from '@/app/lib/vaultFs';

// Resource registry: the physical and administrative substrate app
// development depends on — machines, drives, Apple certificates and
// provisioning profiles, subscriptions, licenses, domains. Anything with an
// `expires` date is surfaced before it silently breaks a build or a renewal.

export const RESOURCE_TYPES = ['machine', 'drive', 'certificate', 'subscription', 'license', 'service', 'domain', 'other'];

export async function listResources() {
  try {
    return JSON.parse(await readFile(RESOURCES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function save(resources) {
  await ensureDir(path.dirname(RESOURCES_FILE));
  await writeFile(RESOURCES_FILE, JSON.stringify(resources, null, 2), 'utf-8');
}

export async function upsertResource(resource) {
  const resources = await listResources();
  const id = resource.id || crypto.randomUUID();
  const idx = resources.findIndex((r) => r.id === id);
  const record = {
    id,
    name: resource.name || 'Unnamed resource',
    type: RESOURCE_TYPES.includes(resource.type) ? resource.type : 'other',
    detail: resource.detail || '',
    expires: resource.expires || '',           // YYYY-MM-DD, optional
    monthlyCost: resource.monthlyCost || '',   // free text: "9.99 USD"
    notes: resource.notes || '',
    updated: new Date().toISOString().slice(0, 10),
  };
  if (idx === -1) resources.push(record);
  else resources[idx] = record;
  await save(resources);
  return record;
}

export async function deleteResource(id) {
  const resources = await listResources();
  const next = resources.filter((r) => r.id !== id);
  await save(next);
  return next.length !== resources.length;
}

export function expiryInfo(resource, horizonDays = 45) {
  if (!resource.expires) return { expiring: false, expired: false, daysLeft: null };
  const days = Math.ceil((new Date(resource.expires).getTime() - Date.now()) / 86400000);
  return { expired: days < 0, expiring: days >= 0 && days <= horizonDays, daysLeft: days };
}
