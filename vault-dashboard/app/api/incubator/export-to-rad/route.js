import fs from 'fs';
import path from 'path';
import os from 'os';

const incubatorDir = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Obsidian',
  'VisionAppDev',
  'Incubator'
);

const defaultRADCommandsDir = path.join(
  os.homedir(),
  'Library',
  'Containers',
  'com.revivrstudios.RAD',
  'Data',
  'Library',
  'Application Support',
  'RADCommands'
);

function parseFrontmatter(content) {
  const match = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match || !match[1]) return {};

  return match[1].split('\n').reduce((data, line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return data;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) data[key] = value;
    return data;
  }, {});
}

function updateFrontmatter(content, fields) {
  const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
  const match = content.match(frontmatterRegex);
  if (!match || !match[1]) return content;

  let lines = match[1].split('\n');
  Object.entries(fields).forEach(([key, value]) => {
    let found = false;
    lines = lines.map((line) => {
      if (line.trim().startsWith(`${key}:`)) {
        found = true;
        return `${key}: ${value}`;
      }
      return line;
    });
    if (!found) lines.push(`${key}: ${value}`);
  });

  return content.replace(match[1], lines.join('\n'));
}

function appendProgressNote(content, note) {
  if (content.includes(note)) return content;
  if (content.includes('## Progress Notes')) {
    return content.replace('## Progress Notes', `## Progress Notes\n${note}`);
  }
  return `${content.trim()}\n\n## Progress Notes\n${note}\n`;
}

function hasRADExport(experiment) {
  return experiment.rad_export_status === 'exported' ||
    experiment.rad_candidate === 'promoted' ||
    Boolean(experiment.rad_project_id) ||
    Boolean(experiment.rad_project_slug);
}

function hasQueuedRADExport(experiment) {
  return experiment.rad_export_status === 'queued' && Boolean(experiment.rad_export_command_id);
}

function waitForResult(commandsDir, commandID, timeoutMs = 40000) {
  const resultPath = path.join(commandsDir, 'results', `${commandID}.json`);
  const started = Date.now();

  return new Promise((resolve) => {
    const poll = () => {
      if (fs.existsSync(resultPath)) {
        try {
          resolve({ resultPath, result: JSON.parse(fs.readFileSync(resultPath, 'utf8')) });
        } catch (error) {
          resolve({ resultPath, result: null, error });
        }
        return;
      }

      if (Date.now() - started >= timeoutMs) {
        resolve({ resultPath, result: null, timeout: true });
        return;
      }

      setTimeout(poll, 1000);
    };

    poll();
  });
}

function extractSection(content, heading) {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapStatus(status) {
  switch ((status || '').toLowerCase()) {
    case 'idea':
      return 'Idea';
    case 'queued':
      return 'Planning';
    case 'active':
      return 'In Development';
    case 'paused':
    case 'blocked':
      return 'On Hold';
    case 'archived':
      return 'Archived';
    default:
      return 'Planning';
  }
}

function escapeShell(value) {
  return `'${String(value || '').replace(/'/g, `'\\''`)}'`;
}

function addIfPresent(lines, label, value) {
  if (value) lines.push(`${label}: ${value}`);
}

function buildRADCommand(experiment, content, filename, fullPath) {
  const name = experiment.name || experiment.id || 'Untitled Incubator Experiment';
  const summary = extractSection(content, 'Summary');
  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(name);

  const notes = [
    `Imported from Revivr Experiment Incubator on ${today}.`,
    '',
    `Incubator ID: ${experiment.id || ''}`,
    `Incubator file: ${filename}`,
  ];

  addIfPresent(notes, 'Incubator path', fullPath);
  addIfPresent(notes, 'Incubator status', experiment.status);
  addIfPresent(notes, 'Incubator type', experiment.type);
  addIfPresent(notes, 'Machine', experiment.machine);
  addIfPresent(notes, 'Agent', experiment.agent);
  addIfPresent(notes, 'Backup', experiment.backup);
  addIfPresent(notes, 'Handoff risk', experiment.handoff_risk);
  addIfPresent(notes, 'Project folder', experiment.project_folder);
  addIfPresent(notes, 'Git repo', experiment.git_repo);
  addIfPresent(notes, 'Branch', experiment.branch);
  addIfPresent(notes, 'Notes file', experiment.notes_file);
  addIfPresent(notes, 'Last touched', experiment.last_touched);
  addIfPresent(notes, 'RAD candidate', experiment.rad_candidate);

  const payload = {
    name,
    slug,
    aliases: [experiment.id, name].filter(Boolean).join(', '),
    appClassification: 'Experimental App',
    classificationRationale: 'Promoted from the Revivr Experiment Incubator for RAD tracking.',
    status: mapStatus(experiment.status),
    priority: experiment.priority || 'medium',
    repositoryURL: experiment.git_repo || '',
    appDescription: summary,
    planningNotes: notes.join('\n'),
    nextAction: experiment.next_step || '',
    sourceSystem: 'revivr-operations-incubator',
    sourceExperimentID: experiment.id || '',
    sourceExperimentFilename: filename,
    sourceExperimentPath: fullPath,
    incubatorStatus: experiment.status || '',
    incubatorType: experiment.type || '',
    incubatorAgent: experiment.agent || '',
    machine: experiment.machine || '',
    backupStatus: experiment.backup || '',
    handoffRisk: experiment.handoff_risk || '',
    projectFolder: experiment.project_folder || '',
    localProjectPath: experiment.project_folder || '',
    branch: experiment.branch || '',
    notesFile: experiment.notes_file || '',
    radCandidate: experiment.rad_candidate || '',
    importedAt: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === null) payload[key] = '';
  });

  const commandID = `incubator-${experiment.id || slug}-${Date.now()}`;
  const command = {
    commandID,
    issuedBy: 'revivr-operations-incubator',
    action: 'create_project',
    projectName: name,
    payload,
  };

  const shellPairs = Object.entries(payload)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${escapeShell(value)}`)
    .join(' ');
  const shellCommand = `rad-command create_project ${escapeShell(name)} ${shellPairs}`;

  return { command, shellCommand };
}

export async function POST(req) {
  try {
    const { filename, mode = 'queue' } = await req.json();
    if (!filename) {
      return Response.json({ error: 'Missing filename' }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || !safeFilename.endsWith('.md')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(incubatorDir, safeFilename);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Experiment file not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const experiment = parseFrontmatter(content);
    const { command, shellCommand } = buildRADCommand(experiment, content, safeFilename, filePath);

    if (mode === 'preview') {
      return Response.json({ success: true, command, shellCommand });
    }

    if (hasRADExport(experiment)) {
      return Response.json({
        error: `${experiment.name || experiment.id || 'This experiment'} has already been exported to RAD.`,
        exportStatus: 'exported',
        radProjectID: experiment.rad_project_id || '',
        radProjectSlug: experiment.rad_project_slug || '',
      }, { status: 409 });
    }

    if (hasQueuedRADExport(experiment)) {
      return Response.json({
        error: `${experiment.name || experiment.id || 'This experiment'} already has a pending RAD export.`,
        exportStatus: 'queued',
        commandID: experiment.rad_export_command_id,
      }, { status: 409 });
    }

    const commandsDir = process.env.RAD_COMMANDS_DIR || defaultRADCommandsDir;
    const pendingDir = path.join(commandsDir, 'pending');
    const resultsDir = path.join(commandsDir, 'results');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.mkdirSync(resultsDir, { recursive: true });

    const queuedPath = path.join(pendingDir, `${command.commandID}.json`);
    fs.writeFileSync(queuedPath, `${JSON.stringify(command, null, 2)}\n`, 'utf8');

    const queuedAt = new Date().toISOString();
    let updatedContent = updateFrontmatter(content, {
      rad_export_status: 'queued',
      rad_export_command_id: command.commandID,
      rad_export_queued_at: queuedAt,
      last_touched: queuedAt.slice(0, 10),
    });
    fs.writeFileSync(filePath, updatedContent, 'utf8');

    const { result, resultPath, timeout } = await waitForResult(commandsDir, command.commandID);

    if (result?.success) {
      const exportedAt = new Date().toISOString();
      const exportedFields = {
        status: 'promoted',
        rad_candidate: 'promoted',
        rad_export_status: 'exported',
        rad_exported_at: exportedAt,
        rad_export_command_id: command.commandID,
        rad_project_id: result.projectID || result.data?.project?.projectID || '',
        rad_project_slug: result.projectSlug || result.data?.project?.slug || '',
        rad_project_name: result.projectName || result.data?.project?.name || command.projectName,
        last_touched: exportedAt.slice(0, 10),
      };
      updatedContent = updateFrontmatter(fs.readFileSync(filePath, 'utf8'), exportedFields);
      updatedContent = appendProgressNote(
        updatedContent,
        `- ${exportedAt.slice(0, 10)}: Exported to RAD as ${exportedFields.rad_project_name} (${exportedFields.rad_project_slug || exportedFields.rad_project_id}).`
      );
      fs.writeFileSync(filePath, updatedContent, 'utf8');

      return Response.json({
        success: true,
        exportStatus: 'exported',
        queuedPath,
        resultPath,
        commandID: command.commandID,
        command,
        result,
        fields: exportedFields,
        shellCommand,
      });
    }

    if (timeout) {
      return Response.json({
        success: true,
        exportStatus: 'queued',
        queuedPath,
        resultPath,
        commandID: command.commandID,
        command,
        shellCommand,
        message: 'RAD command was queued, but no result was available before the request timed out.',
        fields: {
          rad_export_status: 'queued',
          rad_export_command_id: command.commandID,
          rad_export_queued_at: queuedAt,
        },
      });
    }

    const failedAt = new Date().toISOString();
    const failedFields = {
      rad_export_status: 'failed',
      rad_export_command_id: command.commandID,
      rad_export_failed_at: failedAt,
      last_touched: failedAt.slice(0, 10),
    };
    updatedContent = updateFrontmatter(fs.readFileSync(filePath, 'utf8'), failedFields);
    fs.writeFileSync(filePath, updatedContent, 'utf8');

    return Response.json({
      success: false,
      exportStatus: 'failed',
      queuedPath,
      resultPath,
      commandID: command.commandID,
      command,
      result,
      shellCommand,
      fields: failedFields,
      error: result?.message || 'RAD import failed.',
    }, { status: 502 });
  } catch (error) {
    console.error('Error exporting incubator experiment to RAD:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
