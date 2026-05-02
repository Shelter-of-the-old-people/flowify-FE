import { addWorkflowNodeAPI } from "./add-workflow-node.api";
import { createGoogleDriveFolderAPI } from "./create-google-drive-folder.api";
import { createWorkflowAPI } from "./create-workflow.api";
import { deleteWorkflowNodeAPI } from "./delete-workflow-node.api";
import { deleteWorkflowAPI } from "./delete-workflow.api";
import { generateWorkflowAPI } from "./generate-workflow.api";
import { getMappingRulesAPI } from "./get-mapping-rules.api";
import { getSinkCatalogAPI } from "./get-sink-catalog.api";
import { getSinkSchemaAPI } from "./get-sink-schema.api";
import { getSourceCatalogAPI } from "./get-source-catalog.api";
import { getTargetOptionsAPI } from "./get-target-options.api";
import { getWorkflowChoicesAPI } from "./get-workflow-choices.api";
import { getWorkflowListAPI } from "./get-workflow-list.api";
import { getWorkflowSchemaPreviewAPI } from "./get-workflow-schema-preview.api";
import { getWorkflowAPI } from "./get-workflow.api";
import { previewWorkflowSchemaAPI } from "./preview-workflow-schema.api";
import { selectWorkflowChoiceAPI } from "./select-workflow-choice.api";
import { shareWorkflowAPI } from "./share-workflow.api";
import { updateWorkflowNodeAPI } from "./update-workflow-node.api";
import { updateWorkflowAPI } from "./update-workflow.api";

export * from "./types";

export const workflowApi = {
  getList: getWorkflowListAPI,
  getById: getWorkflowAPI,
  getSourceCatalog: getSourceCatalogAPI,
  createGoogleDriveFolder: createGoogleDriveFolderAPI,
  getTargetOptions: getTargetOptionsAPI,
  getSinkCatalog: getSinkCatalogAPI,
  getSinkSchema: getSinkSchemaAPI,
  getMappingRules: getMappingRulesAPI,
  getSchemaPreview: getWorkflowSchemaPreviewAPI,
  create: createWorkflowAPI,
  update: updateWorkflowAPI,
  delete: deleteWorkflowAPI,
  addNode: addWorkflowNodeAPI,
  updateNode: updateWorkflowNodeAPI,
  deleteNode: deleteWorkflowNodeAPI,
  getChoices: getWorkflowChoicesAPI,
  selectChoice: selectWorkflowChoiceAPI,
  previewSchema: previewWorkflowSchemaAPI,
  share: shareWorkflowAPI,
  generate: generateWorkflowAPI,
};
