import { Box } from "@chakra-ui/react";

import { useCreateWorkflow } from "../model/useCreateWorkflow";

import { CreationMethodStep } from "./CreationMethodStep";
import { EndNodeStep } from "./EndNodeStep";
import { StartNodeStep } from "./StartNodeStep";

export const CreationGuide = () => {
  const {
    currentStep,
    startNode,
    endNode,
    setStartNode,
    setEndNode,
    goNext,
    goPrev,
    submitCreation,
  } = useCreateWorkflow();

  return (
    <Box maxW="560px" mx="auto" mt={20} px={6}>
      {currentStep === "start-node" && (
        <StartNodeStep
          selection={startNode}
          onSelect={setStartNode}
          onNext={goNext}
        />
      )}
      {currentStep === "end-node" && (
        <EndNodeStep
          selection={endNode}
          onSelect={setEndNode}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
      {currentStep === "creation-method" && (
        <CreationMethodStep onSubmit={submitCreation} onPrev={goPrev} />
      )}
    </Box>
  );
};
