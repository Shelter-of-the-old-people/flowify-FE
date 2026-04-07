import { useRef } from "react";

import type { Node } from "@xyflow/react";

import { NODE_REGISTRY } from "@/entities/node";
import type { DataType } from "@/entities/node";
import type { FlowNodeData, NodeType } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

const BASE_POSITION = { x: 250, y: 250 };
const OFFSET_STEP = 30;

interface AddNodeOptions {
  position?: { x: number; y: number };
  config?: Partial<FlowNodeData["config"]>;
  inputTypes?: DataType[];
  outputTypes?: DataType[];
  label?: string;
}

export const useAddNode = () => {
  const addNode = useWorkflowStore((state) => state.addNode);
  const callCountRef = useRef(0);

  const addNodeByType = (type: NodeType, options?: AddNodeOptions): string => {
    const meta = NODE_REGISTRY[type];

    let position: { x: number; y: number };
    if (options?.position) {
      position = options.position;
    } else {
      const offset = callCountRef.current * OFFSET_STEP;
      callCountRef.current += 1;
      position = {
        x: BASE_POSITION.x + offset,
        y: BASE_POSITION.y + offset,
      };
    }

    const node: Node<FlowNodeData> = {
      id: crypto.randomUUID(),
      type,
      position,
      data: {
        type,
        label: options?.label ?? meta.label,
        config: {
          ...meta.defaultConfig,
          ...options?.config,
        } as FlowNodeData["config"],
        inputTypes: options?.inputTypes
          ? [...options.inputTypes]
          : [...meta.defaultInputTypes],
        outputTypes: options?.outputTypes
          ? [...options.outputTypes]
          : [...meta.defaultOutputTypes],
      },
    };

    addNode(node);
    return node.id;
  };

  return { addNode: addNodeByType };
};
