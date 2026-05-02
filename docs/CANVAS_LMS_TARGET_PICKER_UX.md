# Canvas LMS Target Picker UX

## Background

The original start-node setup for `Canvas LMS` required users to type a course ID or term name manually.
That caused a few UX problems:

- Users had to remember or copy numeric `course_id` values.
- Invalid IDs were easy to enter and hard to verify during setup.
- The confirm step showed opaque IDs instead of readable names.

## Main Change

The `Canvas LMS` start-node flow now uses remote pickers instead of plain text input.

- `course_files` and `course_new_file` use `course_picker`
- `term_all_files` uses `term_picker`
- The picker searches remote options from Spring and stores both:
  - `target`: the actual execution value
  - `target_label`: the readable display value

## Files

- `src/features/add-node/ui/ServiceSelectionPanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/get-target-options.api.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/api/types.ts`

## UX Outcome

- Users can search by course name or term name instead of typing raw IDs.
- The confirm step shows readable labels.
- The saved workflow still keeps the backend-friendly `target` value.

## Follow-up Fixes

Two regressions were fixed after the initial picker rollout.

1. `Canvas LMS` was missing from the FE source rollout allowlist.
This caused the service to disappear from the start-node service list even though the backend catalog returned it.

2. `canvas_lms` was missing from the visual node type mapping.
This caused `Start Node Create` to silently return without creating a node after the user completed the picker flow.

Applied fixes:

- Added `canvas_lms` modes back to `src/features/add-node/model/source-rollout.ts`
- Added `canvas_lms -> storage` mapping to `src/entities/workflow/lib/workflow-node-adapter.ts`
- Made the remote option list scroll internally when the picker grows long so the `Next` button stays visible
- Lowered the internal picker max height to `min(240px, 30vh)` so long course lists do not clip the `Next` button on smaller viewports
- Extended the storage-node presentation mapping so a created Canvas start node is labeled as `Canvas LMS` instead of the generic `Storage`
- Kept `term_all_files` showing past terms, but limited `course_new_file` to active courses only

## Validation

- `pnpm exec eslint src/features/add-node/ui/ServiceSelectionPanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/get-target-options.api.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm exec eslint src/features/add-node/model/source-rollout.ts src/entities/workflow/lib/workflow-node-adapter.ts`
- `pnpm exec tsc --noEmit`
- `pnpm test`

Current test note:

- This repo currently has no test files, so `pnpm test` exits with `No test files found, exiting with code 0`.
