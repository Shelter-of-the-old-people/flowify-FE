import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Box, Button, Input, Text } from "@chakra-ui/react";

import {
  DEFAULT_WORKFLOW_TIMEZONE,
  INTERVAL_HOUR_PRESETS,
  WEEKDAY_ORDER,
  buildTriggerStateFromDraft,
  createTriggerDraft,
  getWeekdayLabel,
  getWorkflowTriggerSummary,
  hasTriggerDraftChanges,
  validateTriggerDraft,
} from "@/entities/workflow";
import { useWorkflowStore } from "@/features/workflow-editor";

type TriggerSettingsButtonProps = {
  canEdit: boolean;
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
    px="10px"
    py="4px"
    bg={active ? "#272727" : "#f3f3f3"}
    color={active ? "#efefef" : "#272727"}
    borderRadius="999px"
    fontFamily="'Pretendard Variable', sans-serif"
    fontWeight="normal"
    fontSize="12px"
    lineHeight="normal"
    border={active ? "none" : "1px solid #d8d8d8"}
    _hover={{ bg: active ? "#3a3a3a" : "#ececec" }}
    _active={{ bg: active ? "#1f1f1f" : "#e4e4e4" }}
    _disabled={{
      opacity: 0.55,
      cursor: "not-allowed",
      _hover: { bg: active ? "#272727" : "#f3f3f3" },
    }}
  >
    {children}
  </Button>
);

export const TriggerSettingsButton = ({
  canEdit,
}: TriggerSettingsButtonProps) => {
  const workflowTrigger = useWorkflowStore((state) => state.workflowTrigger);
  const workflowActive = useWorkflowStore((state) => state.workflowActive);
  const setWorkflowTriggerState = useWorkflowStore(
    (state) => state.setWorkflowTriggerState,
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    createTriggerDraft(workflowTrigger, workflowActive),
  );

  const summary = useMemo(
    () => getWorkflowTriggerSummary(workflowTrigger, workflowActive),
    [workflowActive, workflowTrigger],
  );
  const validationError = validateTriggerDraft(draft);
  const hasDraftChanges = hasTriggerDraftChanges(
    draft,
    workflowTrigger,
    workflowActive,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        if (canEdit && hasDraftChanges) {
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [canEdit, hasDraftChanges, isOpen]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      setDraft(createTriggerDraft(workflowTrigger, workflowActive));
      setIsOpen(true);
      return;
    }

    if (canEdit && hasDraftChanges) {
      return;
    }

    setIsOpen(false);
  };

  const handleApply = () => {
    if (validationError || !canEdit) {
      return;
    }

    const nextState = buildTriggerStateFromDraft(draft);
    setWorkflowTriggerState(nextState.trigger, nextState.active);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDraft(createTriggerDraft(workflowTrigger, workflowActive));
    setIsOpen(false);
  };

  return (
    <Box position="absolute" right="0" bottom="72px" ref={panelRef}>
      <Button
        type="button"
        onClick={handleToggleOpen}
        height="32px"
        minWidth="auto"
        px="12px"
        py="4px"
        bg="#fefefe"
        color="#272727"
        border="1px solid #d8d8d8"
        borderRadius="999px"
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="medium"
        fontSize="13px"
        lineHeight="normal"
        _hover={{ bg: "#f7f7f7" }}
        _active={{ bg: "#efefef" }}
      >
        {summary}
      </Button>

      {isOpen ? (
        <Box
          position="absolute"
          right="0"
          bottom="44px"
          width="360px"
          bg="#fefefe"
          border="1px solid #e3e3e3"
          borderRadius="20px"
          boxShadow="0 18px 40px rgba(0, 0, 0, 0.18)"
          px="18px"
          py="16px"
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
                    border="1px solid #e0e0e0"
                    borderRadius="12px"
                    bg="#f8f8f8"
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
                          intervalHours: Number.parseInt(
                            event.target.value,
                            10,
                          ),
                        }))
                      }
                    />
                    <Text color="#666" fontSize="11px">
                      1~2시간은 빠른 확인, 4시간은 일반 권장, 6~12시간은 여유
                      있는 확인에 적합합니다. 하루 한 번이면 daily를 더
                      권장합니다.
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
              <Text color="#666" fontSize="11px">
                공유된 워크플로우에서는 자동 실행 설정을 수정할 수 없습니다.
              </Text>
            ) : null}

            {validationError ? (
              <Text color="#d64545" fontSize="11px">
                {validationError}
              </Text>
            ) : null}

            {canEdit && hasDraftChanges ? (
              <Text color="#666" fontSize="11px">
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
      ) : null}
    </Box>
  );
};
