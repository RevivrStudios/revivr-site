import fs from 'fs';
import path from 'path';
import { MARKETING_VAULT_ROOT, parseApprovalFrontmatter, noStoreHeaders } from '../_shared';

// Marketing experiments — same closure discipline as the Incubator registry
// (Social Plan Phase 7): hypothesis, single variable, success signal, check
// date (end_date), closed with a verdict (result/impact). Individual files
// live in 04 Experiments/ (see 08 Templates/experiment.template.md); this
// route is the read-only rollup + overdue-check flagging for /marketing/report.
const EXPERIMENTS_DIR = path.join(MARKETING_VAULT_ROOT, '04 Experiments');

export async function GET() {
  if (!fs.existsSync(EXPERIMENTS_DIR)) {
    return Response.json({ experiments: [], activeCount: 0, overdueCount: 0, multipleActiveWarning: false }, { headers: noStoreHeaders });
  }
  const files = fs.readdirSync(EXPERIMENTS_DIR).filter((f) => f.endsWith('.md'));
  const today = new Date();

  const experiments = files.map((file) => {
    const content = fs.readFileSync(path.join(EXPERIMENTS_DIR, file), 'utf8');
    const fm = parseApprovalFrontmatter(content);
    const overdue = fm.status === 'active' && fm.end_date && new Date(fm.end_date) < today;
    return {
      file,
      experiment_id: fm.experiment_id || file.replace(/\.md$/, ''),
      app_id: fm.app_id || '',
      hypothesis: fm.hypothesis || '',
      start_date: fm.start_date || '',
      end_date: fm.end_date || '',
      status: fm.status || 'active',
      result: fm.result || '',
      overdue,
    };
  });

  const activeCount = experiments.filter((e) => e.status === 'active').length;
  const overdueCount = experiments.filter((e) => e.overdue).length;

  return Response.json(
    { experiments, activeCount, overdueCount, multipleActiveWarning: activeCount > 1 },
    { headers: noStoreHeaders }
  );
}
