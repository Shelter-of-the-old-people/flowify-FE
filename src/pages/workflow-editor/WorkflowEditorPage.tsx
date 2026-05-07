import { useEffect, useRef } from "react";
import { MdErrorOutline } from "react-icons/md";
import { useNavigate, useParams } from "react-router";

import { Box, Button, Icon, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";

import { useWorkflowQuery } from "@/entities/workflow";
import { ServiceSelectionPanel } from "@/features/add-node";
import { hydrateStore, useWorkflowStore } from "@/features/workflow-editor";
import { EDITOR_CANVAS_AREA_ID, ROUTE_PATHS, getAuthUser } from "@/shared";
import { Canvas, EditorRemoteBar, InputPanel, OutputPanel } from "@/widgets";

import { useChoiceWizardController } from "./model";

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
  const syncWorkflowGraph = useWorkflowStore(
    (state) => state.syncWorkflowGraph,
  );
  const setEditorCapabilities = useWorkflowStore(
    (state) => state.setEditorCapabilities,
  );
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const resetEditor = useWorkflowStore((state) => state.resetEditor);
  const { data: workflow, isLoading, isError } = useWorkflowQuery(id);
  const choiceWizardController = useChoiceWizardController();
  const hydratedWorkflowIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate(ROUTE_PATHS.WORKFLOWS, { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!workflow) {
      return;
    }

    const nextState = hydrateStore(workflow);

    if (hydratedWorkflowIdRef.current !== workflow.id) {
      hydrateWorkflow(nextState);
      hydratedWorkflowIdRef.current = workflow.id;
      return;
    }

    syncWorkflowGraph(nextState, {
      preserveActivePanelNodeId: true,
      preserveActivePlaceholder: true,
      preserveDirty: true,
    });
  }, [hydrateWorkflow, syncWorkflowGraph, workflow]);

  useEffect(() => {
    if (!workflow) {
      return;
    }

    const authUser = getAuthUser();
    const isOwner = workflow.userId === authUser?.id;

    setEditorCapabilities({
      canViewEditor: true,
      canEditNodes: isOwner,
      canSaveWorkflow: isOwner,
      canRunWorkflow: isOwner,
    });
  }, [setEditorCapabilities, workflow]);

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
      {!canEditNodes ? (
        <Box
          position="absolute"
          top="24px"
          left="50%"
          transform="translateX(-50%)"
          zIndex={6}
          px={4}
          py={2}
          borderRadius="999px"
          bg="#272727"
          color="#efefef"
          boxShadow="0 4px 12px rgba(0, 0, 0, 0.18)"
        >
          <Text fontSize="sm" fontWeight="medium">
            공유된 워크플로우입니다. 편집은 소유자만 가능합니다.
          </Text>
        </Box>
      ) : null}
      <Canvas />
      <EditorRemoteBar />
      <ServiceSelectionPanel />
      <InputPanel />
      <OutputPanel wizardController={choiceWizardController} />
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
