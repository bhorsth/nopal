## DHIS2 Integration Plan (FridgeTag → DHIS2 Tracker)

This document tracks the stepwise implementation plan and checkpoints.

### 1) Add DHIS2 configuration scaffolding
- Define env vars: base URL, username, password, program ID, program stage ID, orgUnit ID, TE type ID.
- Add a config helper to read/validate and surface missing vars clearly.
- Checkpoint: start app/CLI; config helper reports missing vars; dummy command prints resolved config (no secrets).

### 2) Implement DHIS2 client layer
- **Browser (DHIS2 app shell)**: use `@dhis2/app-runtime` (`useDataEngine`) for all API calls (no env-based auth or base URL in the bundle).
- **CLI/Node**: use env-based config with basic auth (as in `check-dhis2-config`).
- Service functions (shared semantics): 
**search TE by serial (attribute `XHdkwj2Gzi8`)**, 
**get TE events (implemented 16.12, no erros, but output needs to be better formatted)**, 
create/update events (POST `/api/42/tracker?async=false`), 
enroll TE with enrollment.
- Checkpoint: unit tests with mocked runtime/fetch assert URLs, payloads; manual tests via UI (runtime) and CLI (Node).

### 3) Build FridgeTag → DHIS2 mapper
- Pure mapper from parsed records to Tracker payload: dataValues per DHIS2.md, minutes → `hh:mm`, computed status/condition.
- Reuse for UI and CLI.
- Checkpoint: unit tests on sample parsed data validate payload shape/values.

### 4) Wire UI actions (read-only/dry-run first)
- In FileUploader flow, add buttons to search TE, fetch events, dry-run push (show payload/diffs), and enroll if missing.
- Present results/diffs; no writes yet.
- Checkpoint: manual UI with sample file shows dry-run output; React test verifies controls invoke mocks; handles missing config gracefully.

### 5) Enable write operations with safeguards
- Add “Push events” and “Enroll device” actions that perform writes with confirmation; support dry-run flag; handle bundle reports and counts.
- Checkpoint: sandbox/mocked run confirms created/updated counts and error handling; dry-run skips POSTs.

### 6) Extend CLI parity
- Extend `cli.js` commands: `search`, `get-events`, `check-events`, `create-events`, `enroll`, `--dry-run`, `--debug`; reuse mapper/client; allow file input for serial and records.
- Checkpoint: CLI tests with mocked HTTP exit 0 and print expected payloads; manual `--dry-run --debug` shows payloads.

### Ongoing hygiene
- After each step: run lint/tests (`yarn test`), quick manual UI pass for UI steps, CLI sample runs for CLI steps.

