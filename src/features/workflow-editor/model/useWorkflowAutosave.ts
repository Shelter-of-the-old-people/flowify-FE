import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMutating } from "@tanstack/react-query";

import {
  type WorkflowResponse,
  workflowMutationKeys,
} from "@/entities/workflow";
import { getApiErrorMessage } from "@/shared/utils";

import { useSaveWorkflowMutation } from "./useSaveWorkflowMutation";
import { type WorkflowEditorSaveState } from "./workflow-editor-adapter";
import { useWorkflowStore } from "./workflowStore";

export type WorkflowSaveStatus =
  | "idle"
  | "scheduled"
  | "saving"
  | "saved"
  | "error";

type WorkflowAutosaveOptions = {
  enabled?: boolean;
  delayMs?: number;
  maxWaitMs?: number;
};

type WorkflowAutosaveResult = {
  saveStatus: WorkflowSaveStatus;
  saveErrorMessage: string | null;
  flushSave: () => Promise<WorkflowResponse | null>;
};

const AUTOSAVE_DELAY_MS = 1200;
const AUTOSAVE_MAX_WAIT_MS = 6000;

const isSaveShortcut = (event: KeyboardEvent) =>
  (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

const toSaveState = (
  state: ReturnType<typeof useWorkflowStore.getState>,
): WorkflowEditorSaveState => ({
  workflowName: state.workflowName,
  workflowTrigger: state.workflowTrigger,
  workflowActive: state.workflowActive,
  nodes: state.nodes,
  edges: state.edges,
  startNodeId: state.startNodeId,
  endNodeIds: state.endNodeIds,
  endNodeId: state.endNodeId,
});

export const useWorkflowAutosave = ({
  enabled = true,
  delayMs = AUTOSAVE_DELAY_MS,
  maxWaitMs = AUTOSAVE_MAX_WAIT_MS,
}: WorkflowAutosaveOptions = {}): WorkflowAutosaveResult => {
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const canSaveWorkflow = useWorkflowStore(
    (state) => state.editorCapabilities.canSaveWorkflow,
  );
  const structureMutationCount = useIsMutating({
    mutationKey: workflowMutationKeys.structure,
  });
  const nodeConfigMutationCount = useIsMutating({
    mutationKey: workflowMutationKeys.nodeConfig,
  });
  const blockingMutationCount =
    structureMutationCount + nodeConfigMutationCount;
  const { mutateAsync: saveWorkflow } = useSaveWorkflowMutation({
    retry: false,
    showErrorToast: false,
  });

  const [saveStatus, setSaveStatus] = useState<WorkflowSaveStatus>("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const delayTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<WorkflowResponse | null> | null>(null);
  const runSaveRef = useRef<() => Promise<WorkflowResponse | null>>();

  const clearAutosaveTimers = useCallback(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    if (maxWaitTimerRef.current !== null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!enabled || !workflowId || !canSaveWorkflow) {
      return;
    }

    setSaveErrorMessage(null);
    setSaveStatus((current) => (current === "saving" ? current : "scheduled"));

    if (blockingMutationCount > 0 || savePromiseRef.current) {
      return;
    }

    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
    }

    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      void runSaveRef.current?.();
    }, delayMs);

    if (maxWaitTimerRef.current === null) {
      maxWaitTimerRef.current = window.setTimeout(() => {
        if (delayTimerRef.current !== null) {
          window.clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }

        maxWaitTimerRef.current = null;
        void runSaveRef.current?.();
      }, maxWaitMs);
    }
  }, [
    blockingMutationCount,
    canSaveWorkflow,
    delayMs,
    enabled,
    maxWaitMs,
    workflowId,
  ]);

  const runSave = useCallback(async (): Promise<WorkflowResponse | null> => {
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    if (!enabled || !workflowId || !canSaveWorkflow) {
      return null;
    }

    if (blockingMutationCount > 0) {
      setSaveStatus("scheduled");
      return null;
    }

    const state = useWorkflowStore.getState();

    if (!state.workflowId || !state.isDirty) {
      setSaveStatus("saved");
      setSaveErrorMessage(null);
      return null;
    }

    clearAutosaveTimers();
    setSaveStatus("saving");
    setSaveErrorMessage(null);

    const savePromise = saveWorkflow({
      workflowId: state.workflowId,
      dirtyRevision: state.dirtyRevision,
      store: toSaveState(state),
    })
      .then((workflow) => {
        const stillDirty = useWorkflowStore.getState().isDirty;

        setSaveStatus(stillDirty ? "scheduled" : "saved");
        setSaveErrorMessage(null);

        return workflow;
      })
      .catch((error: unknown) => {
        setSaveStatus("error");
        setSaveErrorMessage(getApiErrorMessage(error));

        return null;
      })
      .finally(() => {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }

        if (useWorkflowStore.getState().isDirty) {
          scheduleSave();
        }
      });

    savePromiseRef.current = savePromise;

    return savePromise;
  }, [
    blockingMutationCount,
    canSaveWorkflow,
    clearAutosaveTimers,
    enabled,
    saveWorkflow,
    scheduleSave,
    workflowId,
  ]);

  const flushSave = useCallback(async () => {
    clearAutosaveTimers();
    return runSave();
  }, [clearAutosaveTimers, runSave]);

  useEffect(() => {
    runSaveRef.current = runSave;
  }, [runSave]);

  useEffect(() => {
    if (!enabled || !workflowId || !canSaveWorkflow) {
      clearAutosaveTimers();
      const timeoutId = window.setTimeout(() => {
        setSaveStatus("idle");
        setSaveErrorMessage(null);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (isDirty) {
      const timeoutId = window.setTimeout(scheduleSave, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      if (!savePromiseRef.current) {
        setSaveStatus("saved");
        setSaveErrorMessage(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    blockingMutationCount,
    canSaveWorkflow,
    clearAutosaveTimers,
    enabled,
    isDirty,
    scheduleSave,
    workflowId,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) {
        return;
      }

      event.preventDefault();
      void flushSave();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flushSave]);

  useEffect(
    () => () => {
      clearAutosaveTimers();
    },
    [clearAutosaveTimers],
  );

  return {
    saveStatus,
    saveErrorMessage,
    flushSave,
  };
};
