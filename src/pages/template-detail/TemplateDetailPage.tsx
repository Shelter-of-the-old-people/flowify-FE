import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";

import { Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react";

import { useInstantiateTemplateMutation, useTemplateQuery } from "@/entities";
import { ROUTE_PATHS, buildPath } from "@/shared";

import { buildTemplatePreviewGraph } from "./model";
import {
  TemplateInfoPanel,
  TemplatePreviewLayout,
  TemplateWorkflowPreview,
} from "./ui";

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, isError, refetch } = useTemplateQuery(id);
  const { mutateAsync: instantiateTemplate, isPending } =
    useInstantiateTemplateMutation();
  const previewGraph = useMemo(
    () => (template ? buildTemplatePreviewGraph(template) : null),
    [template],
  );

  const handleInstantiate = async () => {
    if (!id) {
      return;
    }

    try {
      const workflow = await instantiateTemplate(id);
      navigate(buildPath.workflowEditor(workflow.id));
    } catch {
      return;
    }
  };

  if (isLoading) {
    return (
      <VStack py={16} gap={4} color="gray.500">
        <Spinner size="lg" />
        <Text>템플릿 정보를 불러오는 중입니다.</Text>
      </VStack>
    );
  }

  if (isError || !template) {
    return (
      <VStack py={16} gap={4} color="gray.500">
        <Text>템플릿 정보를 불러오지 못했습니다.</Text>
        <HStack>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTE_PATHS.TEMPLATES)}
          >
            목록으로 이동
          </Button>
          <Button variant="outline" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <TemplatePreviewLayout
      sidebar={
        <TemplateInfoPanel
          template={template}
          isPending={isPending}
          onInstantiate={() => void handleInstantiate()}
          onBack={() => navigate(ROUTE_PATHS.TEMPLATES)}
        />
      }
      preview={<TemplateWorkflowPreview graph={previewGraph} />}
    />
  );
}
