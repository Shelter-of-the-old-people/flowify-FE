import { Box, Spinner, Text } from "@chakra-ui/react";

import { type ExecutionNodeData } from "@/entities";

import { type NodeDataPanelKind, type NodeDataPanelState } from "../model";

type Props = {
  state: NodeDataPanelState;
  panelKind: NodeDataPanelKind;
  executionData: ExecutionNodeData | null;
  isStaleAgainstCurrentEditor: boolean;
};

const getPanelLabel = (panelKind: NodeDataPanelKind) =>
  panelKind === "input" ? "입력" : "출력";

const getNoticeTitle = (
  state: NodeDataPanelState,
  panelKind: NodeDataPanelKind,
) => {
  const panelLabel = getPanelLabel(panelKind);

  switch (state) {
    case "permission-denied":
      return "실행 결과 접근 제한";
    case "loading":
      return `${panelLabel} 데이터 확인 중`;
    case "error":
      return `${panelLabel} 데이터 조회 실패`;
    case "no-execution":
      return "아직 실행 기록 없음";
    case "execution-running":
      return "워크플로우 실행 중";
    case "node-skipped":
      return "노드 건너뜀";
    case "node-failed":
      return "노드 실행 실패";
    case "node-not-executed":
      return "노드 미실행";
    case "data-empty":
      return `${panelLabel} 데이터 없음`;
    case "no-node":
      return "선택한 노드 없음";
    case "data-ready":
      return "";
  }
};

const getNoticeDescription = (
  state: NodeDataPanelState,
  panelKind: NodeDataPanelKind,
  executionData: ExecutionNodeData | null,
) => {
  const panelLabel = getPanelLabel(panelKind);

  switch (state) {
    case "permission-denied":
      return "실행 결과 데이터는 워크플로우 소유자만 확인할 수 있습니다.";
    case "loading":
      return `최근 실행 기준 ${panelLabel} 데이터를 불러오고 있습니다.`;
    case "error":
      return `${panelLabel} 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.`;
    case "no-execution":
      return "실행 전에는 실제 데이터 대신 예상 스키마를 표시합니다.";
    case "execution-running":
      return "실행이 끝나면 최신 노드 데이터가 표시됩니다.";
    case "node-skipped":
      return "이번 실행에서 해당 노드는 조건에 의해 실행되지 않았습니다.";
    case "node-failed":
      return (
        executionData?.error?.message ??
        "이번 실행에서 해당 노드가 실패했습니다."
      );
    case "node-not-executed":
      return "최근 실행 기록에 해당 노드 실행 정보가 없습니다.";
    case "data-empty":
      return `최근 실행에서 확인할 수 있는 ${panelLabel} 데이터가 없습니다.`;
    case "no-node":
      return "노드를 선택하면 데이터 흐름을 확인할 수 있습니다.";
    case "data-ready":
      return "";
  }
};

export const DataStateNotice = ({
  state,
  panelKind,
  executionData,
  isStaleAgainstCurrentEditor,
}: Props) => {
  if (state === "data-ready") {
    return isStaleAgainstCurrentEditor ? (
      <Text fontSize="xs" color="orange.500">
        최근 저장 및 실행 기준 데이터입니다. 현재 편집 중인 내용과 다를 수
        있습니다.
      </Text>
    ) : null;
  }

  const title = getNoticeTitle(state, panelKind);
  const description = getNoticeDescription(state, panelKind, executionData);
  const isLoading = state === "loading" || state === "execution-running";
  const isError = state === "error" || state === "node-failed";

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={1}
      px={4}
      py={3}
      borderRadius="xl"
      bg={isError ? "red.50" : "gray.50"}
      border="1px solid"
      borderColor={isError ? "red.100" : "gray.100"}
    >
      <Box display="flex" alignItems="center" gap={2}>
        {isLoading ? <Spinner size="xs" color="gray.500" /> : null}
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={isError ? "red.500" : "gray.700"}
        >
          {title}
        </Text>
      </Box>
      <Text fontSize="sm" color={isError ? "red.500" : "text.secondary"}>
        {description}
      </Text>
      {isStaleAgainstCurrentEditor ? (
        <Text fontSize="xs" color="orange.500">
          최근 저장 및 실행 기준 정보입니다.
        </Text>
      ) : null}
    </Box>
  );
};
