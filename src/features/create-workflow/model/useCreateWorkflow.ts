import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import type { NodeCategory } from "@/entities/node";
import { buildPath, useWorkflowStore } from "@/shared";

// ─── 스텝 정의 ──────────────────────────────────────────────
export type CreationStep = "start-node" | "end-node" | "creation-method";

const STEP_ORDER: CreationStep[] = [
  "start-node",
  "end-node",
  "creation-method",
];

// ─── 노드 선택 상태 ─────────────────────────────────────────
export interface NodeSelection {
  category: NodeCategory | null;
  service: string | null;
}

const INITIAL_SELECTION: NodeSelection = {
  category: null,
  service: null,
};

// ─── Hook ────────────────────────────────────────────────────
export const useCreateWorkflow = () => {
  const navigate = useNavigate();
  const setWorkflowMeta = useWorkflowStore((s) => s.setWorkflowMeta);

  const [currentStep, setCurrentStep] = useState<CreationStep>("start-node");
  const [startNode, setStartNode] = useState<NodeSelection>(INITIAL_SELECTION);
  const [endNode, setEndNode] = useState<NodeSelection>(INITIAL_SELECTION);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStepIndex]);

  const goPrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

  const submitCreation = useCallback(
    (method: "ai" | "direct") => {
      // TODO: API 연동 후 실제 워크플로우 생성 요청
      const tempId = crypto.randomUUID();
      setWorkflowMeta(tempId, "새 워크플로우");
      navigate(buildPath.workflowEditor(tempId));

      // method는 추후 AI 생성 흐름 구현 시 분기에 사용
      void method;
    },
    [navigate, setWorkflowMeta],
  );

  return {
    currentStep,
    startNode,
    endNode,
    setStartNode,
    setEndNode,
    goNext,
    goPrev,
    submitCreation,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === STEP_ORDER.length - 1,
  };
};
