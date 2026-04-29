import {
  type SelectWorkflowChoiceCommand,
  type SelectWorkflowChoiceRequestPayload,
  type SelectWorkflowChoiceTransportMeta,
} from "./types";

export const toSelectWorkflowChoicePayload = (
  command: SelectWorkflowChoiceCommand,
  transportMeta?: SelectWorkflowChoiceTransportMeta,
): SelectWorkflowChoiceRequestPayload => {
  const payload: SelectWorkflowChoiceRequestPayload = {
    actionId: command.optionId,
  };

  if (transportMeta?.dataType) {
    payload.dataType = transportMeta.dataType;
  }

  if (command.context) {
    payload.context = command.context;
  }

  return payload;
};
