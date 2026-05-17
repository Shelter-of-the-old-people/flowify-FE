import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  Box,
  Button,
  HStack,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  type ManualTokenSupportedService,
  type OAuthConnectionTone,
  type OAuthTokenSummary,
  getOAuthConnectionUiState,
  getServiceConnectionKind,
  isManualTokenSupported,
  isOAuthConnectSupported,
  useConnectOAuthTokenMutation,
  useDisconnectOAuthTokenMutation,
  useOAuthTokensQuery,
  useSinkCatalogQuery,
  useSourceCatalogQuery,
  useUpsertManualTokenMutation,
} from "@/entities";
import {
  ServiceTokenDialog,
  ServiceTokenHelpDialog,
} from "@/features/service-token";
import {
  ROUTE_PATHS,
  getAuthUser,
  getCurrentRelativeUrl,
  storeOAuthConnectReturnPath,
} from "@/shared";

type ManagedServiceItem = {
  key: string;
  label: string;
  kind: ReturnType<typeof getServiceConnectionKind>;
};

type CatalogServiceSummary = {
  key: string;
  label: string;
  auth_required: boolean;
};

type ManualTokenCardState = {
  label: string;
  description: string;
  badgeLabel: string;
  tone: OAuthConnectionTone;
  actionLabel: string;
};

type AccountPageProps = {
  headingEyebrow?: string;
  headingTitle?: string;
  headingDescription?: string;
  manualTokenLocationLabel?: string;
  showQuickLinks?: boolean;
};

const DEFAULT_SERVICE_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_drive: "Google Drive",
  notion: "Notion",
  github: "GitHub",
  canvas_lms: "Canvas LMS",
};

const CONNECTION_TONE_STYLES: Record<
  OAuthConnectionTone,
  { badgeColor: string; bg: string; borderColor: string }
> = {
  error: {
    badgeColor: "red.600",
    bg: "red.50",
    borderColor: "red.100",
  },
  neutral: {
    badgeColor: "gray.500",
    bg: "gray.50",
    borderColor: "gray.200",
  },
  success: {
    badgeColor: "green.600",
    bg: "green.50",
    borderColor: "green.100",
  },
  warning: {
    badgeColor: "orange.600",
    bg: "orange.50",
    borderColor: "orange.100",
  },
};

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "-";

const isManagedAccountService = (serviceKey: string) =>
  isOAuthConnectSupported(serviceKey) || isManualTokenSupported(serviceKey);

const toManualTokenServiceKey = (
  serviceKey: string,
): ManualTokenSupportedService | null => {
  if (!isManualTokenSupported(serviceKey)) {
    return null;
  }

  return serviceKey as ManualTokenSupportedService;
};

const buildManagedServices = (
  sourceServices: CatalogServiceSummary[] | undefined,
  sinkServices: CatalogServiceSummary[] | undefined,
): ManagedServiceItem[] => {
  const serviceMap = new Map<string, ManagedServiceItem>();

  for (const service of [...(sourceServices ?? []), ...(sinkServices ?? [])]) {
    if (
      !service.auth_required ||
      service.key === "google_sheets" ||
      !isManagedAccountService(service.key)
    ) {
      continue;
    }

    serviceMap.set(service.key, {
      key: service.key,
      label: service.label,
      kind: getServiceConnectionKind(service.key),
    });
  }

  for (const [serviceKey, label] of Object.entries(DEFAULT_SERVICE_LABELS)) {
    if (!isManagedAccountService(serviceKey) || serviceMap.has(serviceKey)) {
      continue;
    }

    serviceMap.set(serviceKey, {
      key: serviceKey,
      label,
      kind: getServiceConnectionKind(serviceKey),
    });
  }

  return Array.from(serviceMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
};

const getManualTokenCardState = (
  token: OAuthTokenSummary | undefined,
  locationLabel = "계정 페이지",
): ManualTokenCardState => {
  if (token?.connected) {
    return {
      label: "연결 완료",
      description: "검증된 토큰으로 바로 사용할 수 있습니다.",
      badgeLabel: "CONNECTED",
      tone: "success",
      actionLabel: "토큰 갱신",
    };
  }

  if (token?.validationStatus === "scope_insufficient") {
    return {
      label: "권한 부족",
      description:
        token.reason?.trim() ??
        "현재 저장된 토큰의 권한이 부족해 다시 입력이 필요합니다.",
      badgeLabel: "SCOPE REQUIRED",
      tone: "warning",
      actionLabel: "토큰 다시 입력",
    };
  }

  if (token?.validationStatus === "invalid") {
    return {
      label: "검증 실패",
      description:
        token.reason?.trim() ?? "현재 저장된 토큰이 유효하지 않습니다.",
      badgeLabel: "INVALID TOKEN",
      tone: "error",
      actionLabel: "토큰 다시 입력",
    };
  }

  if (token?.reason?.trim()) {
    return {
      label: "상태 확인 필요",
      description: token.reason.trim(),
      badgeLabel: "CHECK NEEDED",
      tone: "warning",
      actionLabel: "토큰 다시 입력",
    };
  }

  return {
    label: "토큰 입력 필요",
    description: `${locationLabel}에서 토큰을 직접 입력해 연결합니다.`,
    badgeLabel: "TOKEN REQUIRED",
    tone: "neutral",
    actionLabel: "토큰 입력",
  };
};

const getManualTokenAccountSummary = (token: OAuthTokenSummary | undefined) => {
  const labels = [token?.accountLabel?.trim(), token?.accountEmail?.trim()]
    .filter(Boolean)
    .join(" / ");

  return labels || "-";
};

const getManualTokenValidationLabel = (
  token: OAuthTokenSummary | undefined,
) => {
  switch (token?.validationStatus) {
    case "valid":
      return "검증 완료";
    case "invalid":
      return "유효하지 않은 토큰";
    case "scope_insufficient":
      return "권한 부족";
    default:
      return token?.connected ? "연결 완료" : "확인 필요";
  }
};

export default function AccountPage({
  headingEyebrow = "ACCOUNT",
  headingTitle = "계정과 서비스 연결",
  headingDescription = "현재 로그인 정보와 외부 서비스 연결 상태를 한 번에 확인할 수 있습니다.",
  manualTokenLocationLabel = "계정 페이지",
  showQuickLinks = true,
}: AccountPageProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = getAuthUser();
  const {
    data: tokens,
    isLoading: isOAuthTokensLoading,
    isError: isOAuthTokensError,
    refetch: refetchOAuthTokens,
  } = useOAuthTokensQuery();
  const {
    data: sourceCatalog,
    isLoading: isSourceCatalogLoading,
    isError: isSourceCatalogError,
    refetch: refetchSourceCatalog,
  } = useSourceCatalogQuery();
  const {
    data: sinkCatalog,
    isLoading: isSinkCatalogLoading,
    isError: isSinkCatalogError,
    refetch: refetchSinkCatalog,
  } = useSinkCatalogQuery();
  const { mutateAsync: connectToken, isPending: isConnectPending } =
    useConnectOAuthTokenMutation();
  const { mutateAsync: disconnectToken, isPending: isDisconnectPending } =
    useDisconnectOAuthTokenMutation();
  const { mutateAsync: upsertManualToken, isPending: isManualTokenPending } =
    useUpsertManualTokenMutation({
      showErrorToast: false,
    });

  const [pendingServiceKey, setPendingServiceKey] = useState<string | null>(
    null,
  );
  const [selectedManualServiceKey, setSelectedManualServiceKey] =
    useState<ManualTokenSupportedService | null>(null);
  const [selectedManualServiceLabel, setSelectedManualServiceLabel] =
    useState("");
  const [manualDialogErrorMessage, setManualDialogErrorMessage] = useState<
    string | null
  >(null);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

  const tokenMap = useMemo(
    () => new Map((tokens ?? []).map((token) => [token.service, token])),
    [tokens],
  );
  const managedServices = useMemo(
    () => buildManagedServices(sourceCatalog?.services, sinkCatalog?.services),
    [sinkCatalog?.services, sourceCatalog?.services],
  );
  const oauthServices = useMemo(
    () =>
      managedServices.filter((service) => service.kind === "oauth_redirect"),
    [managedServices],
  );
  const manualServices = useMemo(
    () => managedServices.filter((service) => service.kind === "manual_token"),
    [managedServices],
  );
  const selectedManualToken = selectedManualServiceKey
    ? tokenMap.get(selectedManualServiceKey)
    : undefined;
  const isCatalogLoading = isSourceCatalogLoading || isSinkCatalogLoading;
  const isConnectionSectionLoading =
    isOAuthTokensLoading ||
    isCatalogLoading ||
    isConnectPending ||
    isDisconnectPending ||
    isManualTokenPending;
  const isConnectionSectionError =
    isOAuthTokensError || isSourceCatalogError || isSinkCatalogError;

  const openManualTokenDialogByServiceKey = useCallback(
    (serviceKey: string, fallbackLabel?: string) => {
      const manualServiceKey = toManualTokenServiceKey(serviceKey);
      if (!manualServiceKey) {
        return false;
      }

      const matchedService = managedServices.find(
        (service) => service.key === serviceKey,
      );

      setSelectedManualServiceKey(manualServiceKey);
      setSelectedManualServiceLabel(
        matchedService?.label ??
          fallbackLabel ??
          DEFAULT_SERVICE_LABELS[serviceKey] ??
          serviceKey,
      );
      setManualDialogErrorMessage(null);
      setIsTokenDialogOpen(true);

      return true;
    },
    [managedServices],
  );

  const handleConnect = async (service: string) => {
    if (!isOAuthConnectSupported(service)) {
      return;
    }

    setPendingServiceKey(service);

    try {
      const result = await connectToken(service);
      if (result.kind === "redirect") {
        storeOAuthConnectReturnPath(getCurrentRelativeUrl());
        window.location.assign(result.authUrl);
        return;
      }

      await refetchOAuthTokens();
    } catch {
      // 카드 상태를 유지하고 현재 문구로 안내한다.
    } finally {
      setPendingServiceKey(null);
    }
  };

  const handleDisconnect = async (service: string) => {
    setPendingServiceKey(service);

    try {
      await disconnectToken(service);
      await refetchOAuthTokens();
    } catch {
      // 카드 상태를 유지하고 현재 문구로 안내한다.
    } finally {
      setPendingServiceKey(null);
    }
  };

  const openManualTokenDialog = (service: ManagedServiceItem) => {
    openManualTokenDialogByServiceKey(service.key, service.label);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const connectService = searchParams.get("connectService");
    if (!connectService) {
      return;
    }

    const opened = openManualTokenDialogByServiceKey(connectService);
    if (!opened) {
      return;
    }

    searchParams.delete("connectService");

    navigate(
      {
        pathname: location.pathname,
        search: searchParams.toString() ? `?${searchParams.toString()}` : "",
      },
      { replace: true },
    );
  }, [
    location.pathname,
    location.search,
    managedServices,
    navigate,
    openManualTokenDialogByServiceKey,
  ]);

  const openManualHelpDialog = (service: ManagedServiceItem) => {
    const manualServiceKey = toManualTokenServiceKey(service.key);
    if (!manualServiceKey) {
      return;
    }

    setSelectedManualServiceKey(manualServiceKey);
    setSelectedManualServiceLabel(service.label);
    setIsHelpDialogOpen(true);
  };

  const handleSubmitManualToken = async (accessToken: string) => {
    if (!selectedManualServiceKey) {
      return;
    }

    setPendingServiceKey(selectedManualServiceKey);

    try {
      setManualDialogErrorMessage(null);
      await upsertManualToken({
        service: selectedManualServiceKey,
        accessToken,
      });
      await refetchOAuthTokens();
      setIsTokenDialogOpen(false);
    } catch (error) {
      setManualDialogErrorMessage(
        error instanceof Error ? error.message : "토큰을 저장하지 못했습니다.",
      );
    } finally {
      setPendingServiceKey(null);
    }
  };

  const handleRetryConnectionSection = () => {
    void Promise.all([
      refetchOAuthTokens(),
      refetchSourceCatalog(),
      refetchSinkCatalog(),
    ]);
  };

  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          {headingEyebrow}
        </Text>
        <Heading size="xl" mb={3}>
          {headingTitle}
        </Heading>
        <Text color="gray.600">{headingDescription}</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, xl: showQuickLinks ? 2 : 1 }} gap={6}>
        <Box
          p={8}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={3}>
            PROFILE
          </Text>
          <Heading size="lg" mb={2}>
            {authUser?.name ?? "로그인 사용자"}
          </Heading>
          <Text color="gray.600" mb={6}>
            {authUser?.email ?? "표시할 사용자 정보가 없습니다."}
          </Text>

          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text color="gray.500">사용자 ID</Text>
              <Text fontWeight="medium">{authUser?.id ?? "-"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">가입 시각</Text>
              <Text fontWeight="medium">
                {authUser?.createdAt
                  ? new Date(authUser.createdAt).toLocaleString()
                  : "-"}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">세션 상태</Text>
              <Text fontWeight="medium">
                {authUser ? "로그인 유지 중" : "세션 정보 없음"}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {showQuickLinks ? (
          <Box
            p={8}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="28px"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
          >
            <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={3}>
              QUICK LINKS
            </Text>
            <Heading size="md" mb={4}>
              자주 여는 화면
            </Heading>
            <VStack align="stretch" gap={3}>
              <Button
                justifyContent="flex-start"
                variant="outline"
                onClick={() => navigate(ROUTE_PATHS.WORKFLOWS)}
              >
                워크플로우 목록
              </Button>
              <Button
                justifyContent="flex-start"
                variant="outline"
                onClick={() => navigate(ROUTE_PATHS.TEMPLATES)}
              >
                템플릿 목록
              </Button>
              <Button
                justifyContent="flex-start"
                variant="outline"
                onClick={() => navigate(ROUTE_PATHS.SETTINGS)}
              >
                설정 화면
              </Button>
            </VStack>
          </Box>
        ) : null}
      </SimpleGrid>

      <Box
        mt={6}
        p={8}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="28px"
        boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
      >
        <HStack justify="space-between" align="flex-start" mb={6}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
              EXTERNAL SERVICES
            </Text>
            <Heading size="md" mb={2}>
              외부 서비스 연결
            </Heading>
            <Text color="gray.600">
              OAuth 서비스와 직접 토큰을 넣는 서비스를 같은 화면에서 관리할 수
              있습니다.
            </Text>
          </Box>
          {isConnectionSectionLoading ? <Spinner size="sm" /> : null}
        </HStack>

        {isConnectionSectionError ? (
          <VStack align="stretch" gap={3}>
            <Text color="red.500">연결 목록을 불러오지 못했습니다.</Text>
            <Button
              alignSelf="flex-start"
              variant="outline"
              onClick={handleRetryConnectionSection}
            >
              다시 시도
            </Button>
          </VStack>
        ) : (
          <VStack align="stretch" gap={8}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
                OAUTH REDIRECT
              </Text>
              <Heading size="sm" mb={2}>
                바로 인증해 연결하는 서비스
              </Heading>
              <Text color="gray.600" fontSize="sm" mb={4}>
                Gmail과 Google Drive는 OAuth 인증으로 바로 연결합니다.
              </Text>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {oauthServices.map((service) => {
                  const token = tokenMap.get(service.key);
                  const connected = token?.connected ?? false;
                  const authState = getOAuthConnectionUiState({
                    authRequired: true,
                    connected,
                    serviceKey: service.key,
                  });
                  const toneStyle = CONNECTION_TONE_STYLES[authState.tone];
                  const isPending =
                    pendingServiceKey === service.key &&
                    (isConnectPending || isDisconnectPending);

                  return (
                    <Box
                      key={service.key}
                      p={5}
                      border="1px solid"
                      borderColor={toneStyle.borderColor}
                      borderRadius="20px"
                      bg={toneStyle.bg}
                    >
                      <HStack justify="space-between" align="flex-start" mb={3}>
                        <Box>
                          <Heading size="sm" mb={1}>
                            {service.label}
                          </Heading>
                          <Text fontSize="sm" color="gray.600">
                            {authState.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {authState.description}
                          </Text>
                        </Box>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={toneStyle.badgeColor}
                        >
                          {authState.badgeLabel}
                        </Text>
                      </HStack>

                      <VStack align="stretch" gap={2} mb={4}>
                        <Text fontSize="sm" color="gray.600">
                          연결 계정 {token?.accountEmail ?? "-"}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          만료 {formatDateTime(token?.expiresAt)}
                        </Text>
                      </VStack>

                      {connected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDisconnect(service.key)}
                          disabled={isDisconnectPending}
                          loading={isPending && isDisconnectPending}
                        >
                          연결 해제
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void handleConnect(service.key)}
                          disabled={
                            isConnectPending || !authState.canStartConnect
                          }
                          loading={isPending && isConnectPending}
                        >
                          {authState.actionLabel}
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            <Box borderTop="1px solid" borderColor="gray.100" pt={8}>
              <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
                MANUAL TOKENS
              </Text>
              <Heading size="sm" mb={2}>
                직접 발급한 토큰을 저장하는 서비스
              </Heading>
              <Text color="gray.600" fontSize="sm" mb={4}>
                Notion, GitHub, Canvas LMS는 {manualTokenLocationLabel}에서
                토큰을 직접 저장한 뒤 사용합니다.
              </Text>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {manualServices.map((service) => {
                  const token = tokenMap.get(service.key);
                  const state = getManualTokenCardState(
                    token,
                    manualTokenLocationLabel,
                  );
                  const toneStyle = CONNECTION_TONE_STYLES[state.tone];
                  const canDisconnect =
                    Boolean(token) && token?.disconnectable !== false;
                  const isDisconnectLoading =
                    pendingServiceKey === service.key && isDisconnectPending;

                  return (
                    <Box
                      key={service.key}
                      p={5}
                      border="1px solid"
                      borderColor={toneStyle.borderColor}
                      borderRadius="20px"
                      bg={toneStyle.bg}
                    >
                      <HStack justify="space-between" align="flex-start" mb={3}>
                        <Box>
                          <Heading size="sm" mb={1}>
                            {service.label}
                          </Heading>
                          <Text fontSize="sm" color="gray.600">
                            {state.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {state.description}
                          </Text>
                        </Box>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={toneStyle.badgeColor}
                        >
                          {state.badgeLabel}
                        </Text>
                      </HStack>

                      <VStack align="stretch" gap={2} mb={4}>
                        <Text fontSize="sm" color="gray.600">
                          연결 방식 토큰 직접 입력
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          연결 계정 {getManualTokenAccountSummary(token)}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          저장된 토큰 {token?.maskedHint ?? "-"}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          최근 저장 {formatDateTime(token?.updatedAt)}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          검증 상태 {getManualTokenValidationLabel(token)}
                        </Text>
                      </VStack>

                      <HStack wrap="wrap" gap={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManualHelpDialog(service)}
                        >
                          발급 가이드
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openManualTokenDialog(service)}
                        >
                          {state.actionLabel}
                        </Button>
                        {canDisconnect ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDisconnect(service.key)}
                            disabled={isDisconnectPending}
                            loading={isDisconnectLoading}
                          >
                            연결 해제
                          </Button>
                        ) : null}
                      </HStack>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>
          </VStack>
        )}
      </Box>

      <ServiceTokenDialog
        key={`${selectedManualServiceKey ?? "none"}:${isTokenDialogOpen ? "open" : "closed"}`}
        open={isTokenDialogOpen}
        serviceKey={selectedManualServiceKey}
        serviceLabel={selectedManualServiceLabel}
        isConnected={Boolean(selectedManualToken?.connected)}
        isPending={isManualTokenPending}
        errorMessage={manualDialogErrorMessage}
        maskedHint={selectedManualToken?.maskedHint ?? null}
        updatedAt={selectedManualToken?.updatedAt ?? null}
        onClose={() => {
          if (!isManualTokenPending) {
            setIsTokenDialogOpen(false);
            setManualDialogErrorMessage(null);
          }
        }}
        onHelp={() => setIsHelpDialogOpen(true)}
        onSubmit={(accessToken) => void handleSubmitManualToken(accessToken)}
      />

      <ServiceTokenHelpDialog
        open={isHelpDialogOpen}
        serviceKey={selectedManualServiceKey}
        onClose={() => setIsHelpDialogOpen(false)}
      />
    </Box>
  );
}
