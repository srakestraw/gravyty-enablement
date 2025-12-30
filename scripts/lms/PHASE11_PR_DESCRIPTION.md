# Phase 11 - Docs, Testing, and Hardening

Telemetry and Phase 10 rollups are now production-hardened with updated architecture docs, automated tests (unit, repo, integration), and deterministic local verification (Dynalite).

## What changed

- **Docs:** Expanded `lms-v2` architecture coverage for Phases 9-10 (data model, GSIs, reverse index, idempotency, timestamp semantics, troubleshooting).
- **Tests:**
  - Unit tests for `computePathRollup` status transitions, timestamps, idempotency (`apps/api/src/handlers/lms.test.ts`)
  - Repo tests for reverse index mapping sync and limit guards (`apps/api/src/storage/dynamo/lmsRepo.test.ts`)
  - Integration test covering list-view-start-progress-rollups-complete-idempotency (`scripts/lms/phase10_integration_test.ts`)
- **Telemetry:** Added Phase 10 telemetry verification script querying stored events (`scripts/lms/verify_phase10_telemetry.ts`)
- **Refactoring:** Moved `computePathRollup` to `apps/api/src/lms/pathRollup.ts` for testability
- **CI:** Added no-scan check script (`scripts/lms/check_no_scan.sh`) to prevent ScanCommand in Phase 10 flows (excludes imports and non-Phase 10 areas like `listAssignments`)

## How to verify

1. **Start Dynalite:** `npm run dynamo:local`
2. **Setup + seed:** `npm run phase10:setup`
3. **Run tests:** `cd apps/api && npm test`
4. **Run integration:** `DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/phase10_integration_test.ts`
5. **Verify telemetry:** `DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/verify_phase10_telemetry.ts`
6. **Check no-scan:** `npm run check:no-scan`

## Files Changed

### Created
- `apps/api/src/lms/pathRollup.ts` - Extracted computePathRollup for testability
- `apps/api/src/handlers/lms.test.ts` - Unit tests for computePathRollup
- `apps/api/src/storage/dynamo/lmsRepo.test.ts` - Repository tests
- `scripts/lms/phase10_integration_test.ts` - Integration tests
- `scripts/lms/verify_phase10_telemetry.ts` - Telemetry verification script
- `scripts/lms/check_no_scan.sh` - CI-friendly no-scan check
- `scripts/lms/PHASE11_DOCS_TESTING_HARDENING.md` - Phase 11 checklist
- `scripts/lms/PHASE11_PR_DESCRIPTION.md` - This PR description

### Modified
- `docs/architecture/lms-v2.md` - Enhanced Phase 9-10 documentation
- `apps/api/src/handlers/lms.ts` - Import computePathRollup from new module
- `apps/api/package.json` - Added test scripts
- `package.json` - Added phase10:setup and check:no-scan scripts
- `scripts/lms/phase10_paths_rollups_smoke.md` - Added telemetry verification section

## Test Coverage

- ✅ 11 unit tests covering status transitions, timestamps, idempotency
- ✅ 5 repo tests covering reverse index sync, limit guards, Query usage
- ✅ 8 integration tests covering end-to-end flow
- ✅ Hardening verification (concurrency, reserved keywords, error handling, performance)

## Non-Negotiables Maintained

- ✅ No ScanCommand in primary flows (verified via `npm run check:no-scan`)
- ✅ Limit guards (<= 200) enforced
- ✅ Backward compatibility maintained
- ✅ Environment variable naming consistent (`DYNAMODB_ENDPOINT`)
- ✅ Telemetry verifiable via stored events (local Dynalite)

## Verification

See `scripts/lms/PHASE11_VERIFICATION.md` for complete verification results.

**Quick verification:**
```bash
# Typecheck
cd apps/api && npm run typecheck

# No-scan check
npm run check:no-scan

# Verify computePathRollup extraction
grep -r "function computePathRollup" apps/api/src --include="*.ts" | grep -v test
# Should show only: apps/api/src/lms/pathRollup.ts
```

### No-scan check scope

`npm run check:no-scan` enforces that **Phase 10 primary flows do not use DynamoDB ScanCommand**.

The script intentionally excludes:
- Import statements (e.g., `import { ScanCommand ... }`)
- Non-Phase 10 code paths (notably `listAssignments()` - Phase 8/9)
- Comments / documentation strings

Phase 10 surfaces covered:
- Handlers: `listPaths`, `getPathDetail`, `startPath`, `updateProgress` (rollup hook)
- Repo: `listPublishedPathIdsForCourse`, `getPublishedPathsForCourse`

Expected result:
- ✅ PASS when ScanCommand is absent from Phase 10 flows
- ❌ FAIL if ScanCommand is introduced into any Phase 10 primary flow

**If check fails:** Inspect the grep output - it prints the exact file/line where ScanCommand appears.

