export const dualPanelLayoutSpec = {
  safePaddingX: 24,
  safePaddingY: 24,
  basePanelWidth: 690,
  basePanelHeight: 800,
  baseGap: 296,
  compactMinPanelWidth: 520,
  compactMinPanelHeight: 640,
  compactMinGap: 160,
  stackedMaxPanelWidth: 720,
  stackedMaxPanelHeight: 720,
  stackedGap: 24,
  stackedMinPanelHeight: 240,
  wideMinCanvasWidth: 1760,
  wideMinCanvasHeight: 864,
  compactMinCanvasWidth: 1280,
  compactMinCanvasHeight: 720,
} as const;

export const sidebarLayoutSpec = {
  collapsedWidth: 40,
  expandedWidth: 176,
  paddingX: 6,
  paddingY: 24,
  itemSize: 28,
  itemGap: 4,
  sectionGap: 12,
  borderColor: "#ced4da",
} as const;

export const layoutToken = {
  sidebar: {
    collapsedWidth: { value: "40px" },
    expandedWidth: { value: "176px" },
    itemSize: { value: "28px" },
    sectionGap: { value: "12px" },
  },
  panel: {
    wide: { value: "690px" },
    compactMin: { value: "520px" },
    stackedMax: { value: "720px" },
    height: { value: "800px" },
    gap: { value: "296px" },
    stackedGap: { value: "24px" },
  },
} as const;
