import { CommunicationPanel, SpreadsheetPanel } from "../ui/panels";

import { type NodePanelRegistry } from "./types";

/**
 * 각 노드 타입별 설정 패널을 연결하는 registry입니다.
 * 실제 패널이 준비되면 이 객체에 컴포넌트를 추가하면 됩니다.
 */
export const NODE_PANEL_REGISTRY: NodePanelRegistry = {
  communication: CommunicationPanel,
  spreadsheet: SpreadsheetPanel,
};
