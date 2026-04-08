import { useEffect } from "react";
import { MdErrorOutline } from "react-icons/md";
import { useNavigate, useParams } from "react-router";

import { Box, Button, Icon, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";

import { ServiceSelectionPanel } from "@/features/add-node";
import { EDITOR_CANVAS_AREA_ID, ROUTE_PATHS, useWorkflowStore } from "@/shared";
import { Canvas, EditorToolbar, InputPanel, OutputPanel } from "@/widgets";

const EditorLoadingView = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    gap={3}
    color="text.secondary"
  >
    <Spinner size="lg" />
    <Text fontSize="sm">워크플로우를 불러오는 중...</Text>
  </Box>
);

const EditorErrorView = () => {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      gap={4}
      color="text.secondary"
    >
      <Icon as={MdErrorOutline} boxSize={10} color="status.error" />
      <Text fontSize="sm">워크플로우를 불러올 수 없습니다.</Text>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate(ROUTE_PATHS.WORKFLOWS)}
      >
        목록으로 돌아가기
      </Button>
    </Box>
  );
};

const WorkflowEditorInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setWorkflowMeta = useWorkflowStore((state) => state.setWorkflowMeta);
  const resetEditor = useWorkflowStore((state) => state.resetEditor);

  const isLoading = false;
  const isError = false;

  useEffect(() => {
    if (!id) {
      navigate(ROUTE_PATHS.WORKFLOWS, { replace: true });
      return;
    }

    setWorkflowMeta(id, "");

    return () => {
      resetEditor();
    };
  }, [id, navigate, setWorkflowMeta, resetEditor]);

  if (isLoading) {
    return <EditorLoadingView />;
  }

  if (isError) {
    return <EditorErrorView />;
  }

  return (
    <Box
      id={EDITOR_CANVAS_AREA_ID}
      position="relative"
      overflow="hidden"
      height="100%"
    >
      <EditorToolbar variant="overlay" />
      <Canvas />
      <ServiceSelectionPanel />
      <InputPanel />
      <OutputPanel />
    </Box>
  );
};

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
