import {
  type SelectWorkflowChoiceCommand,
  type SelectWorkflowChoiceRequestPayload,
} from "./types";

export const toSelectWorkflowChoicePayload = (
  command: SelectWorkflowChoiceCommand,
): SelectWorkflowChoiceRequestPayload => {
  const payload: SelectWorkflowChoiceRequestPayload = {
    actionId: command.optionId,
  };

  if (command.dataType) {
    payload.dataType = command.dataType;
  }

  if (command.context) {
    payload.context = command.context;
  }

  return payload;
};
