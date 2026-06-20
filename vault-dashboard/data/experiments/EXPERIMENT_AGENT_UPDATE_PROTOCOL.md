# Experiment Agent Update Protocol

## Purpose
This system provides a structured vault-backed registry for tracking early-stage experiments, prototypes, and incubations that have not yet reached RAD (Rapid Application Development) stage.

AI Agents MUST follow this strict protocol to maintain consistency in the `vault-dashboard` visualization layer. The dashboard requires specific YAML frontmatter.

## Agent Workflow: Creating an Experiment
1. Navigate to `/Volumes/Sureal Drive/Revivr Site /vault-dashboard/data/experiments/`.
2. Check `EXPERIMENT_REGISTRY.md` to see the current list and determine the next logical ID (e.g., `EXP-001`, `EXP-002`).
3. Create a new markdown file named `[ID]-[short-name].md` (e.g., `EXP-001-vision-prototype.md`) in the `experiments` folder.
4. Copy the strict structure from `TEMPLATES/EXPERIMENT_TEMPLATE.md`.
5. Fill out the YAML frontmatter EXACTLY following the allowed values.
6. Add an entry to `EXPERIMENT_REGISTRY.md`.

## Agent Workflow: Updating an Experiment
1. Open the relevant `[ID]-[short-name].md` file.
2. Edit ONLY the specific fields requested in the YAML frontmatter block (e.g. `status`, `machine`, `last_touched`, `next_step`).
3. Ensure `last_touched` is updated to the current YYYY-MM-DD date.
4. If appending notes, write them BELOW the frontmatter in the Markdown body section under `## Progress Notes`. Do NOT overwrite history.

## Controlled YAML Frontmatter Vocabularies
*   **status:** `idea`, `queued`, `active`, `paused`, `blocked`, `archived`, `promoted`
*   **type:** `app`, `visual`, `tool`, `prototype`, `mechanic`, `research`, `pipeline`, `other`
*   **machine:** `MacCore`, `MiniTower`, `Mac Studio`, `Laptop`, `Remote Mac`, `Cloud`, `Multiple`, `Unknown`
*   **agent:** `Claude`, `Codex`, `Quinn`, `Antigravity`, `Human`, `Claude+Codex`, `Human+Codex`, `Human+Claude`, `Mixed`
*   **backup:** `none`, `vault only`, `git local`, `git pushed`, `mirrored`, `multi-location`, `unknown`
*   **rad_candidate:** `no`, `watch`, `yes`, `promoted`
*   **handoff_risk:** `low`, `medium`, `high`
