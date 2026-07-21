import fs from 'fs';
import { REGISTRY_PATH, listRadSlugs, radFilePath, parseRadProject, noStoreHeaders } from '../_shared';

export const dynamic = 'force-dynamic';

// Project_Registry.md lists ~26 apps; only a subset are RAD-tracked. Unlike
// the Incubator's registry (which the site fully owns and regenerates), this
// file is mostly hand-maintained for apps RAD has never touched. This route
// updates ONLY the "Current Stage" cell of rows that map to a RAD project —
// never rewrites the whole file, never touches Bundle ID / Path / Check-In
// File for existing rows (RAD has no local-path data to offer there anyway).
// A row with no existing match (Quiet Space, as of Phase 2) gets appended.
const SLUG_TO_REGISTRY_NAME = {
  'ferro-fluid': 'FerroFluid Reactor',
  'glass-aegis': 'Glass Aegis',
  peripal: 'PeriPal',
  rad: 'RevivrAppDesigner',
  'spatial-tree': 'SpatialTree',
  'stare-share': 'Stare&Share',
  'television-prompter': 'TeleVisionPrompter',
  'track-stash': 'Track Stash',
  'vison-pro-markup': 'VisionMarkup',
};

function currentStageCell(project) {
  const lifecycle = project.lifecycle_status || 'Unknown';
  if (project.health_status && project.health_status !== 'On Track') {
    return `${lifecycle} — ${project.health_status}`;
  }
  return lifecycle;
}

function escapeRegExpLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      return Response.json({ error: 'Project_Registry.md not found' }, { status: 404, headers: noStoreHeaders });
    }

    const slugs = listRadSlugs();
    const projects = slugs.map((slug) => {
      const filePath = radFilePath(slug);
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      return parseRadProject(slug, content, stat);
    });

    let registry = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const updated = [];
    const appended = [];

    for (const project of projects) {
      const registryName = SLUG_TO_REGISTRY_NAME[project.slug];
      const stage = currentStageCell(project);

      if (registryName) {
        const escapedName = escapeRegExpLiteral(registryName);
        // Match the row by its bold App Name cell; replace only the 3rd
        // pipe-delimited cell (Current Stage).
        const rowRegex = new RegExp(
          `(\\|\\s*\\*\\*${escapedName}\\*\\*\\s*\\|[^|]*\\|)([^|]*)(\\|)`,
          'm'
        );
        if (rowRegex.test(registry)) {
          registry = registry.replace(rowRegex, `$1 ${stage} $3`);
          updated.push(project.slug);
        } else {
          appended.push(project.slug); // named in the map but row not found as expected — flag, don't guess
        }
      } else if (project.slug === 'quiet-space') {
        // No existing row anywhere — append one immediately after the LAST
        // table row (matched line-by-line, not by searching back from the
        // footer marker), so no blank line ends up inside the table — a
        // blank line mid-table splits it into two separate tables in
        // Markdown/Obsidian rendering.
        const hasRow = /\|\s*\*\*Quiet Space\*\*/.test(registry);
        if (!hasRow) {
          const newRow = `| **Quiet Space** | ${project.bundle_id || 'TBD'} | ${stage} | TBD — see [[RAD/quiet-space]] | [[RAD/quiet-space]] |`;
          const lines = registry.split('\n');
          let lastTableRowIdx = -1;
          lines.forEach((line, i) => {
            if (/^\|.*\|\s*$/.test(line)) lastTableRowIdx = i;
          });
          if (lastTableRowIdx !== -1) {
            lines.splice(lastTableRowIdx + 1, 0, newRow);
            registry = lines.join('\n');
          } else {
            registry = registry.trimEnd() + '\n' + newRow + '\n';
          }
          appended.push(project.slug);
        } else {
          updated.push(project.slug);
        }
      }
    }

    fs.writeFileSync(REGISTRY_PATH, registry, 'utf8');

    return Response.json({ success: true, updated, appended }, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error syncing Project_Registry.md:', error);
    return Response.json({ error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}
