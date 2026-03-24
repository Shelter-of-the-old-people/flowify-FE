import { useRef } from "react";

import type { Node } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { NodeType } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

const BASE_POSITION = { x: 250, y: 250 };
const OFFSET_STEP = 30;

export const useAddNode = () => {
  const addNode = useWorkflowStore((s) => s.addNode);
  const callCountRef = useRef(0);

  const addNodeByType = (type: NodeType) => {
    const meta = NODE_REGISTRY[type];
    const offset = callCountRef.current * OFFSET_STEP;
    callCountRef.current += 1;

    const node: Node = {
      id: crypto.randomUUID(),
      type,
      position: {
        x: BASE_POSITION.x + offset,
        y: BASE_POSITION.y + offset,
      },
      data: {
        type,
        label: meta.label,
        config: { ...meta.defaultConfig },
        inputTypes: [...meta.defaultInputTypes],
        outputTypes: [...meta.defaultOutputTypes],
      },
    };

    addNode(node);
  };

  return { addNode: addNodeByType };
};
