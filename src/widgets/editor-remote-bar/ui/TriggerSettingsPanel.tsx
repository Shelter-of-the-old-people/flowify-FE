import { type ReactNode, useEffect, useRef, useState } from "react";

import { Box, Button, Input, Text } from "@chakra-ui/react";

import {
  DEFAULT_WORKFLOW_TIMEZONE,
  INTERVAL_HOUR_PRESETS,
  type TriggerConfig,
  WEEKDAY_ORDER,
  buildTriggerStateFromDraft,
  createTriggerDraft,
  getWeekdayLabel,
  hasTriggerDraftChanges,
  validateTriggerDraft,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";

type TriggerSettingsPanelProps = {
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
};

type TriggerSettingsPanelContentProps = {
  workflowTrigger: TriggerConfig;
  workflowActive: boolean;
  canEdit: boolean;
  onClose: () => void;
};

type ToggleButtonProps = {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

const ToggleButton = ({
  active,
  children,
  disabled = false,
  onClick,
}: ToggleButtonProps) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={disabled}
    height="28px"
    minWidth="auto"
    px={2.5}
    py={1}
    bg={active ? "neutral.900" : "bg.overlay"}
    color={active ? "text.inverse" : "text.primary"}
    borderRadius="full"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="medium"
    fontSize="xs"
    lineHeight="normal"
    border="1px solid"
    borderColor={active ? "neutral.900" : "border.default"}
    _hover={{ bg: active ? "neutral.800" : "neutral.200" }}
    _active={{ bg: active ? "neutral.950" : "neutral.300" }}
    _disabled={{
      opacity: 0.55,
      cursor: "not-allowed",
      _hover: { bg: active ? "neutral.900" : "bg.overlay" },
    }}
  >
    {children}
  </Button>
);

export const TriggerSettingsPanel = ({
  open,
  canEdit,
  onClose,
}: TriggerSettingsPanelProps) => {
  const workflowTrigger = useWorkflowStore((state) => state.workflowTrigger);
  const workflowActive = useWorkflowStore((state) => state.workflowActive);

  if (!open) {
    return null;
  }

  return (
    <TriggerSettingsPanelContent
      workflowTrigger={workflowTrigger}
      workflowActive={workflowActive}
      canEdit={canEdit}
      onClose={onClose}
    />
  );
};

const TriggerSettingsPanelContent = ({
  workflowTrigger,
  workflowActive,
  canEdit,
  onClose,
}: TriggerSettingsPanelContentProps) => {
  const setWorkflowTriggerState = useWorkflowStore(
    (state) => state.setWorkflowTriggerState,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(() =>
    createTriggerDraft(workflowTrigger, workflowActive),
  );

  const validationError = validateTriggerDraft(draft);
  const hasDraftChanges = hasTriggerDraftChanges(
    draft,
    workflowTrigger,
    workflowActive,
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        if (canEdit && hasDraftChanges) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [canEdit, hasDraftChanges, onClose]);

  const handleApply = () => {
    if (validationError || !canEdit) {
      return;
    }

    const nextState = buildTriggerStateFromDraft(draft);
    setWorkflowTriggerState(nextState.trigger, nextState.active);
    onClose();
  };

  const handleCancel = () => {
    setDraft(createTriggerDraft(workflowTrigger, workflowActive));
    onClose();
  };

  return (
    <Box
      ref={panelRef}
      position="absolute"
      right="0"
      bottom={{ base: "56px", xl: "72px" }}
      width="min(360px, calc(100vw - 32px))"
      maxH="calc(100vh - 120px)"
      overflowY="auto"
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="2xl"
      boxShadow="lg"
      px={{ base: 4, xl: 5 }}
      py={4}
    >
      <Box display="flex" flexDirection="column" gap="14px">
        <Box>
          <Text fontSize="14px" fontWeight="bold" mb="8px">
            자동 실행 설정
          </Text>
          <Box display="flex" gap="8px" flexWrap="wrap">
            <ToggleButton
              active={draft.type === "manual"}
              disabled={!canEdit}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  type: "manual",
                }))
              }
            >
              수동 실행
            </ToggleButton>
            <ToggleButton
              active={draft.type === "schedule"}
              disabled={!canEdit}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  type: "schedule",
                }))
              }
            >
              자동 실행
            </ToggleButton>
          </Box>
        </Box>

        {draft.type === "schedule" ? (
          <>
            <Box>
              <Text fontSize="12px" fontWeight="medium" mb="8px">
                실행 주기
              </Text>
              <Box display="flex" gap="8px" flexWrap="wrap">
                {(
                  [
                    ["interval", "몇 시간마다"],
                    ["daily", "매일"],
                    ["weekly", "매주"],
                  ] as const
                ).map(([mode, label]) => (
                  <ToggleButton
                    key={mode}
                    active={draft.scheduleMode === mode}
                    disabled={!canEdit}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        scheduleMode: mode,
                      }))
                    }
                  >
                    {label}
                  </ToggleButton>
                ))}
              </Box>
            </Box>

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb="8px">
                자동 실행 상태
              </Text>
              <Box display="flex" gap="8px">
                <ToggleButton
                  active={draft.active}
                  disabled={!canEdit}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      active: true,
                    }))
                  }
                >
                  켜짐
                </ToggleButton>
                <ToggleButton
                  active={!draft.active}
                  disabled={!canEdit}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      active: false,
                    }))
                  }
                >
                  꺼짐
                </ToggleButton>
              </Box>
            </Box>

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb="6px">
                시간대
              </Text>
              <Box
                px="12px"
                py="9px"
                border="1px solid"
                borderColor="border.default"
                borderRadius="xl"
                bg="bg.overlay"
              >
                <Text fontSize="13px">{DEFAULT_WORKFLOW_TIMEZONE}</Text>
              </Box>
            </Box>

            {draft.scheduleMode === "interval" ? (
              <Box display="flex" flexDirection="column" gap="8px">
                <Text fontSize="12px" fontWeight="medium">
                  확인 주기
                </Text>
                <Box display="flex" gap="8px" flexWrap="wrap">
                  {INTERVAL_HOUR_PRESETS.map((preset) => (
                    <ToggleButton
                      key={preset}
                      active={draft.intervalHours === preset}
                      disabled={!canEdit}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          intervalHours: preset,
                        }))
                      }
                    >
                      {preset}시간
                    </ToggleButton>
                  ))}
                </Box>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  disabled={!canEdit}
                  value={
                    Number.isFinite(draft.intervalHours)
                      ? draft.intervalHours
                      : ""
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      intervalHours: Number.parseInt(event.target.value, 10),
                    }))
                  }
                />
                <Text color="text.secondary" fontSize="xs">
                  1~2시간은 빠른 확인, 4시간은 일반 권장, 6~12시간은 여유 있는
                  확인에 적합합니다. 하루 한 번이면 daily를 더 권장합니다.
                </Text>
              </Box>
            ) : null}

            {draft.scheduleMode === "daily" ? (
              <Box>
                <Text fontSize="12px" fontWeight="medium" mb="8px">
                  실행 시간
                </Text>
                <Input
                  type="time"
                  disabled={!canEdit}
                  value={draft.timeOfDay}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      timeOfDay: event.target.value,
                    }))
                  }
                />
              </Box>
            ) : null}

            {draft.scheduleMode === "weekly" ? (
              <Box display="flex" flexDirection="column" gap="8px">
                <Text fontSize="12px" fontWeight="medium">
                  요일과 시간
                </Text>
                <Box display="flex" gap="8px" flexWrap="wrap">
                  {WEEKDAY_ORDER.map((weekday) => {
                    const active = draft.weekdays.includes(weekday);

                    return (
                      <ToggleButton
                        key={weekday}
                        active={active}
                        disabled={!canEdit}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            weekdays: active
                              ? current.weekdays.filter(
                                  (item) => item !== weekday,
                                )
                              : WEEKDAY_ORDER.filter(
                                  (item) =>
                                    item === weekday ||
                                    current.weekdays.includes(item),
                                ),
                          }))
                        }
                      >
                        {getWeekdayLabel(weekday)}
                      </ToggleButton>
                    );
                  })}
                </Box>
                <Input
                  type="time"
                  disabled={!canEdit}
                  value={draft.timeOfDay}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      timeOfDay: event.target.value,
                    }))
                  }
                />
              </Box>
            ) : null}

            <Box>
              <Text fontSize="12px" fontWeight="medium" mb="8px">
                실행 중일 때 다음 주기 처리
              </Text>
              <Box display="flex" gap="8px">
                <ToggleButton
                  active={draft.skipIfRunning}
                  disabled={!canEdit}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      skipIfRunning: true,
                    }))
                  }
                >
                  건너뛰기
                </ToggleButton>
                <ToggleButton
                  active={!draft.skipIfRunning}
                  disabled={!canEdit}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      skipIfRunning: false,
                    }))
                  }
                >
                  그대로 실행
                </ToggleButton>
              </Box>
            </Box>
          </>
        ) : null}

        {!canEdit ? (
          <Text color="text.secondary" fontSize="xs">
            공유된 워크플로우에서는 자동 실행 설정을 수정할 수 없습니다.
          </Text>
        ) : null}

        {validationError ? (
          <Text color="status.error" fontSize="xs">
            {validationError}
          </Text>
        ) : null}

        {canEdit && hasDraftChanges ? (
          <Text color="text.secondary" fontSize="xs">
            변경 사항은 적용해야 저장됩니다.
          </Text>
        ) : null}

        <Box display="flex" justifyContent="flex-end" gap="8px">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {canEdit ? "취소" : "닫기"}
          </Button>
          <Button
            type="button"
            disabled={!canEdit || Boolean(validationError)}
            onClick={handleApply}
          >
            적용
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
