import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

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
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

type TriggerSettingsPanelContentProps = {
  workflowTrigger: TriggerConfig;
  workflowActive: boolean;
  canEdit: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

type ToggleButtonProps = {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

type SettingsSectionProps = {
  title?: string;
  children: ReactNode;
};

const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <Box display="flex" flexDirection="column" gap={1.5}>
    {title ? (
      <Text color="text.secondary" fontSize="xs" fontWeight="semibold">
        {title}
      </Text>
    ) : null}
    {children}
  </Box>
);

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
    height="30px"
    minWidth="auto"
    px={2.5}
    py={0}
    bg={active ? "neutral.900" : "bg.surface"}
    color={active ? "text.inverse" : "text.primary"}
    borderRadius="lg"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="medium"
    fontSize="xs"
    lineHeight="normal"
    border="1px solid"
    borderColor={active ? "neutral.900" : "border.default"}
    _hover={{ bg: active ? "neutral.800" : "bg.overlay" }}
    _active={{ bg: active ? "neutral.950" : "neutral.200" }}
    _disabled={{
      opacity: 0.55,
      cursor: "not-allowed",
      _hover: { bg: active ? "neutral.900" : "bg.surface" },
    }}
  >
    {children}
  </Button>
);

const triggerInputProps = {
  height: "32px",
  fontSize: "sm",
  borderRadius: "lg",
  bg: "bg.surface",
  borderColor: "border.default",
} as const;

export const TriggerSettingsPanel = ({
  open,
  canEdit,
  anchorRef,
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
      anchorRef={anchorRef}
      onClose={onClose}
    />
  );
};

const TriggerSettingsPanelContent = ({
  workflowTrigger,
  workflowActive,
  canEdit,
  anchorRef,
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
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const isInsidePanel = panelRef.current?.contains(target) ?? false;
      const isInsideAnchor = anchorRef.current?.contains(target) ?? false;

      if (isInsidePanel || isInsideAnchor) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [anchorRef, onClose]);

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
      bottom={{ base: "44px", xl: "48px" }}
      width="min(340px, calc(100vw - 32px))"
      maxH="calc(100vh - 120px)"
      overflowY="auto"
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="xl"
      boxShadow="lg"
      px={3}
      py={3}
    >
      <Box display="flex" flexDirection="column" gap={3}>
        <SettingsSection>
          <Text fontSize="sm" fontWeight="semibold">
            자동 실행 설정
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
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
        </SettingsSection>

        {draft.type === "schedule" ? (
          <>
            <Box>
              <Text
                color="text.secondary"
                fontSize="xs"
                fontWeight="semibold"
                mb={1.5}
              >
                실행 주기
              </Text>
              <Box display="flex" gap={2} flexWrap="wrap">
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
              <Text
                color="text.secondary"
                fontSize="xs"
                fontWeight="semibold"
                mb={1.5}
              >
                자동 실행 상태
              </Text>
              <Box display="flex" gap={2}>
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
              <Text
                color="text.secondary"
                fontSize="xs"
                fontWeight="semibold"
                mb={1.5}
              >
                시간대
              </Text>
              <Box
                px={2.5}
                py={2}
                border="1px solid"
                borderColor="border.default"
                borderRadius="lg"
                bg="bg.overlay"
              >
                <Text fontSize="sm">{DEFAULT_WORKFLOW_TIMEZONE}</Text>
              </Box>
            </Box>

            {draft.scheduleMode === "interval" ? (
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Text
                  color="text.secondary"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  확인 주기
                </Text>
                <Box display="flex" gap={2} flexWrap="wrap">
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
                  {...triggerInputProps}
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
                <Text
                  color="text.secondary"
                  fontSize="xs"
                  fontWeight="semibold"
                  mb={1.5}
                >
                  실행 시간
                </Text>
                <Input
                  {...triggerInputProps}
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
              <Box display="flex" flexDirection="column" gap={1.5}>
                <Text
                  color="text.secondary"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  요일과 시간
                </Text>
                <Box display="flex" gap={2} flexWrap="wrap">
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
                  {...triggerInputProps}
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
              <Text
                color="text.secondary"
                fontSize="xs"
                fontWeight="semibold"
                mb={1.5}
              >
                실행 중일 때 다음 주기 처리
              </Text>
              <Box display="flex" gap={2}>
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

        <Box display="flex" justifyContent="flex-end" gap={2} pt={1}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            height="30px"
            px={3}
            borderRadius="lg"
            fontSize="xs"
            fontWeight="medium"
          >
            {canEdit ? "취소" : "닫기"}
          </Button>
          <Button
            type="button"
            disabled={!canEdit || Boolean(validationError)}
            onClick={handleApply}
            height="30px"
            px={3}
            bg="neutral.900"
            color="text.inverse"
            borderRadius="lg"
            fontSize="xs"
            fontWeight="medium"
            _hover={{ bg: "neutral.800" }}
            _active={{ bg: "neutral.950" }}
            _disabled={{
              opacity: 0.55,
              cursor: "not-allowed",
              _hover: { bg: "neutral.900" },
            }}
          >
            적용
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
