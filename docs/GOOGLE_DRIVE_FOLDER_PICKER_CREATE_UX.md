# Google Drive Folder Picker/Create UX

## Background

The original Google Drive sink setup required users to paste a raw `folder_id`.
That made the flow slower and less trustworthy:

- users had to leave the app and copy an ID from a Drive URL
- the selected destination was hard to verify by name
- if the folder did not exist yet, users had to create it manually in Drive first

## Main Change

The Google Drive sink now uses a remote `folder_picker` and also supports
creating a new folder directly from the same panel.

- users can browse and search Drive folders
- users can create a new folder at the current location
- the newly created folder is selected immediately
- the workflow stores both:
  - `folder_id`: execution value
  - `folder_id_label`: readable label
- if the Drive connection is disconnected and later restored, the same panel can
  start the reconnect flow again instead of getting stuck in a disabled
  "not supported" state
- after the Google OAuth flow completes, the app returns to the originating
  screen so users can continue configuring the sink without a manual detour

## Files

- `src/features/configure-node/ui/panels/SinkNodePanel.tsx`
- `src/shared/ui/RemoteOptionPicker.tsx`
- `src/entities/workflow/api/create-google-drive-folder.api.ts`
- `src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts`
- `src/entities/workflow/model/useTargetOptionsQuery.ts`
- `src/entities/workflow/model/query-keys.ts`

## API Usage

Folder browse:

- `GET /api/editor-catalog/sources/google_drive/target-options?mode=folder_all_files`

Folder create:

- `POST /api/editor-catalog/sinks/google_drive/folders`

Request body:

```json
{
  "name": "New Folder",
  "parentId": "optional-parent-folder-id"
}
```

## Follow-up Fixes

- Restored the missing `useEffect` import in `src/features/configure-node/ui/panels/SinkNodePanel.tsx`.
- This prevents the Google Drive end-node panel from failing with `Panel could not be displayed.` when the sink configuration panel is opened.

## Validation

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/configure-node/ui/panels/SinkNodePanel.tsx src/shared/ui/RemoteOptionPicker.tsx src/entities/workflow/api/create-google-drive-folder.api.ts src/entities/workflow/model/useCreateGoogleDriveFolderMutation.ts src/entities/workflow/model/useTargetOptionsQuery.ts`
- `pnpm test`

Current test note:

- This repo currently has no test files, so `pnpm test` exits with `No test files found, exiting with code 0`.
