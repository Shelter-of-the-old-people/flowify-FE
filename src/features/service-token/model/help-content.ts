import { type ManualTokenSupportedService } from "@/entities/oauth-token";

export type ServiceTokenHelpLink = {
  label: string;
  href: string;
  description: string;
  emphasis?: "primary" | "secondary";
};

export type ServiceTokenHelpContent = {
  title: string;
  summary: string;
  tokenName: string;
  quickLinks: ServiceTokenHelpLink[];
  steps: string[];
  permissions: string[];
  warnings: string[];
};

const HELP_CONTENT: Record<
  ManualTokenSupportedService,
  ServiceTokenHelpContent
> = {
  notion: {
    title: "Notion 토큰 발급 가이드",
    summary:
      "처음이라면 아래 첫 번째 버튼으로 바로 들어가 새 connection을 만든 뒤, 생성 직후 토큰을 복사해 돌아오면 됩니다.",
    tokenName: "Installation access token",
    quickLinks: [
      {
        label: "Notion integration 페이지 열기",
        href: "https://www.notion.so/profile/integrations",
        description:
          "새 connection을 만들고 토큰을 확인하는 화면으로 바로 이동합니다.",
        emphasis: "primary",
      },
      {
        label: "Notion 권한 / 공유 가이드 보기",
        href: "https://developers.notion.com/guides/get-started/internal-connections",
        description:
          "페이지 공유나 Content access가 헷갈릴 때 참고하기 좋은 공식 가이드입니다.",
      },
      {
        label: "Notion 시작 문서 보기",
        href: "https://developers.notion.com/guides/get-started/create-a-notion-integration",
        description:
          "토큰 위치와 기본 생성 흐름을 그림과 함께 보고 싶을 때 열어보면 좋습니다.",
      },
    ],
    steps: [
      "Notion integration 페이지를 열고 새 connection을 만듭니다.",
      "워크스페이스를 고르고 connection 이름을 적습니다.",
      "Configuration 탭에서 Installation access token을 복사합니다.",
      "Flowify가 읽거나 쓸 페이지 / 데이터베이스를 connection에 공유합니다.",
      "설정 화면의 Notion 카드에 토큰을 붙여 넣고 저장합니다.",
    ],
    permissions: [
      "처음에는 Read content, Update content, Insert content를 켜 두면 대부분의 자동화를 시작하기 쉽습니다.",
      "토큰만 만들어서는 부족하고, 실제로 사용할 페이지나 데이터베이스를 connection에 공유해야 합니다.",
    ],
    warnings: [
      "저장된 토큰 원문은 다시 보여주지 않으니 생성 직후 바로 복사하는 편이 안전합니다.",
      "페이지 공유를 빼먹으면 연결은 되어도 실제 실행에서 권한 오류가 날 수 있습니다.",
    ],
  },
  github: {
    title: "GitHub 토큰 발급 가이드",
    summary:
      "GitHub는 토큰 생성 화면으로 바로 갈 수 있습니다. 먼저 토큰을 만든 뒤, 필요한 저장소 권한만 골라 저장하면 됩니다.",
    tokenName: "Personal access token",
    quickLinks: [
      {
        label: "GitHub 토큰 발급 페이지 열기",
        href: "https://github.com/settings/personal-access-tokens/new",
        description: "새 personal access token 생성 화면으로 바로 이동합니다.",
        emphasis: "primary",
      },
      {
        label: "GitHub 토큰 관리 페이지 열기",
        href: "https://github.com/settings/tokens",
        description:
          "기존 토큰을 확인하거나 다시 발급할 때 쓰는 관리 화면입니다.",
      },
      {
        label: "GitHub 권한 참고 문서 보기",
        href: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
        description:
          "fine-grained 권한이나 조직 정책이 헷갈릴 때 참고하는 공식 문서입니다.",
      },
    ],
    steps: [
      "GitHub 토큰 발급 페이지를 엽니다.",
      "토큰 이름을 Flowify처럼 알아보기 쉽게 적습니다.",
      "자동화에 필요한 저장소와 권한만 선택합니다.",
      "생성 직후 토큰 값을 복사합니다.",
      "설정 화면의 GitHub 카드에 붙여 넣고 저장합니다.",
    ],
    permissions: [
      "읽기 자동화는 repository contents read 수준부터 시작하는 편이 안전합니다.",
      "코드 푸시나 PR 생성이 필요하면 contents write, pull requests write 같은 추가 권한이 필요할 수 있습니다.",
    ],
    warnings: [
      "조직 리포지토리에 연결할 때는 조직의 token 정책이나 승인 절차가 있을 수 있습니다.",
      "발급 직후 토큰 원문을 다시 못 볼 수 있으니 바로 복사해 두는 편이 좋습니다.",
    ],
  },
  canvas_lms: {
    title: "Canvas LMS 토큰 발급 가이드",
    summary:
      "Canvas는 학교나 조직 인스턴스의 설정 화면에서 access token을 만듭니다. 아래 첫 번째 버튼으로 현재 기본 Canvas 설정 화면을 먼저 열어보세요.",
    tokenName: "Canvas access token",
    quickLinks: [
      {
        label: "Canvas 토큰 발급 화면 열기",
        href: "https://canvas.kumoh.ac.kr/profile/settings",
        description:
          "현재 기본 Canvas 인스턴스의 Profile / Settings 화면으로 이동합니다.",
        emphasis: "primary",
      },
      {
        label: "Canvas 토큰 도움말 보기",
        href: "https://developerdocs.instructure.com/services/canvas/resources/access_tokens",
        description:
          "학교별 UI가 달라서 버튼 위치가 다를 때 참고하기 좋은 최신 공식 문서입니다.",
      },
    ],
    steps: [
      "Flowify가 연결하는 같은 Canvas 사이트에 로그인합니다.",
      "Profile 또는 Settings 화면에서 New Access Token 버튼을 찾습니다.",
      "토큰 이름과 만료일을 정하고 생성한 뒤 값을 바로 복사합니다.",
      "토큰 소유 계정이 필요한 코스와 파일을 실제로 볼 수 있는지 확인합니다.",
      "설정 화면의 Canvas LMS 카드에 붙여 넣고 저장합니다.",
    ],
    permissions: [
      "Flowify는 토큰 소유 계정이 실제로 접근 가능한 코스와 파일만 사용할 수 있습니다.",
      "같은 Canvas 도메인에서 만든 토큰이어야 검증과 실행이 일관되게 동작합니다.",
    ],
    warnings: [
      "학교나 조직마다 UI가 조금 달라서 New Access Token 위치가 다를 수 있습니다.",
      "만료일이 짧게 설정된 경우 주기적으로 새 토큰으로 갱신해야 할 수 있습니다.",
    ],
  },
};

export const getServiceTokenHelpContent = (
  service: ManualTokenSupportedService,
) => HELP_CONTENT[service];
