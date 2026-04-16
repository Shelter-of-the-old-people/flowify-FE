import { useEffect } from "react";
import { MdErrorOutline } from "react-icons/md";
import { useNavigate, useParams } from "react-router";

import { Box, Button, Icon, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";

import { useWorkflowQuery } from "@/entities/workflow";
import { ServiceSelectionPanel } from "@/features/add-node";
import { hydrateStore, useWorkflowStore } from "@/features/workflow-editor";
import { EDITOR_CANVAS_AREA_ID, ROUTE_PATHS } from "@/shared";
import { Canvas, EditorRemoteBar, InputPanel, OutputPanel } from "@/widgets";

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
  const hydrateWorkflow = useWorkflowStore((state) => state.hydrateWorkflow);
  const resetEditor = useWorkflowStore((state) => state.resetEditor);
  const { data: workflow, isLoading, isError } = useWorkflowQuery(id);

  useEffect(() => {
    if (!id) {
      navigate(ROUTE_PATHS.WORKFLOWS, { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!workflow) {
      return;
    }

    hydrateWorkflow(hydrateStore(workflow));
  }, [hydrateWorkflow, workflow]);

  useEffect(() => {
    return () => {
      resetEditor();
    };
  }, [resetEditor]);

  if (isLoading) {
    return <EditorLoadingView />;
  }

  if (isError || (!workflow && id)) {
    return <EditorErrorView />;
  }

  return (
    <Box
      id={EDITOR_CANVAS_AREA_ID}
      position="relative"
      overflow="hidden"
      height="100%"
    >
      <Canvas />
      <EditorRemoteBar />
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
