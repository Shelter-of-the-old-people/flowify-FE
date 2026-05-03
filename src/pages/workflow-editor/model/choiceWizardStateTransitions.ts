import {
  type ChoiceBranchConfig,
  type ChoiceFollowUp,
} from "@/entities/workflow";
import {
  type MappingDataTypeKey,
  type ResolvedChoiceOption,
} from "@/features/choice-panel";

export type ChoiceWizardStep = "processing-method" | "action" | "follow-up";

export type ChoiceWizardStatePatch = {
  actionNodeId?: string | null;
  currentDataTypeKey?: MappingDataTypeKey | null;
  selectedAction?: ResolvedChoiceOption | null;
  selectedBranchConfig?: ChoiceBranchConfig | null;
  selectedFollowUp?: ChoiceFollowUp | null;
  selectedProcessingOption?: ResolvedChoiceOption | null;
  wizardStep?: ChoiceWizardStep | null;
};

export const createProcessingMethodTransitionPatch = ({
  nextDataTypeKey,
  nextStep,
  option,
}: {
  option: ResolvedChoiceOption;
  nextDataTypeKey: MappingDataTypeKey;
  nextStep: "action" | "complete";
}): ChoiceWizardStatePatch => ({
  currentDataTypeKey: nextDataTypeKey,
  selectedProcessingOption: option,
  wizardStep: nextStep === "action" ? "action" : null,
});

export const createActionTransitionPatch = ({
  action,
  branchConfig,
  followUp,
  nextDataTypeKey,
  nextStep,
}: {
  action: ResolvedChoiceOption;
  branchConfig: ChoiceBranchConfig | null;
  followUp: ChoiceFollowUp | null;
  nextDataTypeKey: MappingDataTypeKey;
  nextStep: "follow-up" | "complete";
}): ChoiceWizardStatePatch => ({
  currentDataTypeKey: nextDataTypeKey,
  selectedAction: action,
  selectedBranchConfig: branchConfig,
  selectedFollowUp: followUp,
  wizardStep: nextStep === "follow-up" ? "follow-up" : null,
});

export const createBackToProcessingMethodPatch = ({
  initialDataTypeKey,
}: {
  initialDataTypeKey: MappingDataTypeKey;
}): ChoiceWizardStatePatch => ({
  actionNodeId: null,
  currentDataTypeKey: initialDataTypeKey,
  selectedAction: null,
  selectedBranchConfig: null,
  selectedFollowUp: null,
  selectedProcessingOption: null,
  wizardStep: "processing-method",
});

export const createBackToActionPatch = (): ChoiceWizardStatePatch => ({
  selectedAction: null,
  selectedBranchConfig: null,
  selectedFollowUp: null,
  wizardStep: "action",
});

export const resolveBackToActionTargetNodeId = ({
  actionNodeId,
  stagingNodeId,
}: {
  actionNodeId: string | null;
  stagingNodeId: string | null;
}) => actionNodeId ?? stagingNodeId;
