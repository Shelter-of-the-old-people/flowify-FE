import {
  Box,
  Button,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  DrawerTitle,
  Icon,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
  Text,
} from "@chakra-ui/react";

import { getNodesByCategory } from "@/entities/node";
import { type NodeCategory } from "@/entities/node";
import { type NodeType } from "@/entities/node";

import { useAddNode } from "../model/useAddNode";

interface NodeCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { label: string; value: NodeCategory }[] = [
  { label: "도메인", value: "domain" },
  { label: "프로세싱", value: "processing" },
  { label: "AI", value: "ai" },
];

export const NodeCategoryDrawer = ({
  open,
  onClose,
}: NodeCategoryDrawerProps) => {
  const { addNode } = useAddNode();

  const handleNodeClick = (type: NodeType) => {
    addNode(type);
    onClose();
  };

  return (
    <DrawerRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      placement="start"
      size="sm"
    >
      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>노드 추가</DrawerTitle>
          </DrawerHeader>
          <DrawerCloseTrigger />
          <DrawerBody>
            <TabsRoot defaultValue="domain">
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <Box display="flex" flexDirection="column" gap={2} pt={2}>
                    {getNodesByCategory(tab.value).map((meta) => (
                      <Button
                        key={meta.type}
                        variant="ghost"
                        justifyContent="flex-start"
                        gap={2}
                        onClick={() => handleNodeClick(meta.type)}
                      >
                        <Icon as={meta.iconComponent} boxSize={5} />
                        <Text>{meta.label}</Text>
                      </Button>
                    ))}
                  </Box>
                </TabsContent>
              ))}
            </TabsRoot>
          </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  );
};
