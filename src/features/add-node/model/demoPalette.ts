import { type NodeType } from "@/entities/node";

type DemoNodeAvailability =
  | {
      enabled: true;
      badgeLabel: string;
      helperText: string;
    }
  | {
      enabled: false;
      badgeLabel: string;
      helperText: string;
    };

const DEMO_ENABLED_NODE_TYPES = new Set<NodeType>(["llm", "condition"]);

export const getDemoNodeAvailability = (
  type: NodeType,
): DemoNodeAvailability => {
  if (type === "condition") {
    return {
      enabled: DEMO_ENABLED_NODE_TYPES.has(type),
      badgeLabel: "제한적",
      helperText: "동등 비교만 지원",
    };
  }

  if (type === "llm") {
    return {
      enabled: DEMO_ENABLED_NODE_TYPES.has(type),
      badgeLabel: "실행 가능",
      helperText: "현재 데모 경로에서 사용 가능",
    };
  }

  return {
    enabled: false,
    badgeLabel: "Coming Soon",
    helperText: "중간발표 시연 경로에서는 비활성화",
  };
};
