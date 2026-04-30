type ChoiceWizardLogPayload = {
  anchorNodeId?: string | null;
  details?: Record<string, unknown>;
  event: string;
  nextStep?: string | null;
  optionId?: string | null;
  source?: "fallback" | "server" | null;
  step?: string | null;
  targetNodeId?: string | null;
};

export const logChoiceWizardEvent = (payload: ChoiceWizardLogPayload) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info("[choice-wizard]", payload);
};
