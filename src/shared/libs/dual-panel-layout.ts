import { useEffect, useMemo, useState } from "react";

import { dualPanelLayoutSpec } from "@/shared/styles";

type LayoutTargetSize = {
  width: number;
  height: number;
};

export type DualPanelLayoutMode = "wide" | "compact" | "stacked";

export type DualPanelLayout = {
  canvasWidth: number;
  canvasHeight: number;
  mode: DualPanelLayoutMode;
  panelWidth: number;
  panelHeight: number;
  gapWidth: number;
  containerWidth: number;
  containerHeight: number;
  containerLeft: number;
  containerTop: number;
  inputPanelLeft: number;
  inputPanelTop: number;
  outputPanelLeft: number;
  outputPanelTop: number;
  chainCenterX: number;
  chainCenterY: number;
};

export const EDITOR_CANVAS_AREA_ID = "workflow-editor-canvas-area";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const getSafeCenteredPosition = (
  canvasLength: number,
  itemLength: number,
  safePadding: number,
) => {
  const min = safePadding;
  const max = Math.max(min, canvasLength - itemLength - safePadding);

  return clamp((canvasLength - itemLength) / 2, min, max);
};

const readTargetSize = (targetId: string): LayoutTargetSize => {
  if (typeof window === "undefined") {
    return {
      width:
        dualPanelLayoutSpec.basePanelWidth * 2 + dualPanelLayoutSpec.baseGap,
      height: dualPanelLayoutSpec.basePanelHeight,
    };
  }

  const target = document.getElementById(targetId);
  if (target) {
    return {
      width: target.clientWidth,
      height: target.clientHeight,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const getDualPanelLayout = (
  targetSize: LayoutTargetSize | null,
): DualPanelLayout => {
  const {
    safePaddingX,
    safePaddingY,
    basePanelWidth,
    basePanelHeight,
    baseGap,
    compactMinPanelWidth,
    compactMinPanelHeight,
    compactMinGap,
    stackedGap,
    stackedMaxPanelWidth,
    stackedMaxPanelHeight,
    stackedMinPanelHeight,
    wideMinCanvasWidth,
    wideMinCanvasHeight,
    compactMinCanvasWidth,
    compactMinCanvasHeight,
  } = dualPanelLayoutSpec;

  const canvasWidth =
    targetSize?.width ?? basePanelWidth * 2 + baseGap + safePaddingX * 2;
  const canvasHeight = targetSize?.height ?? basePanelHeight + safePaddingY * 2;
  const availableWidth = Math.max(canvasWidth - safePaddingX * 2, 0);
  const availableHeight = Math.max(canvasHeight - safePaddingY * 2, 0);

  if (
    canvasWidth >= wideMinCanvasWidth &&
    canvasHeight >= wideMinCanvasHeight
  ) {
    const panelWidth = Math.min(basePanelWidth, availableWidth);
    const panelHeight = Math.min(basePanelHeight, availableHeight);
    const gapWidth = baseGap;
    const containerWidth = panelWidth * 2 + gapWidth;
    const containerHeight = panelHeight;
    const containerLeft = getSafeCenteredPosition(
      canvasWidth,
      containerWidth,
      safePaddingX,
    );
    const containerTop = getSafeCenteredPosition(
      canvasHeight,
      containerHeight,
      safePaddingY,
    );

    return {
      canvasWidth,
      canvasHeight,
      mode: "wide",
      panelWidth,
      panelHeight,
      gapWidth,
      containerWidth,
      containerHeight,
      containerLeft,
      containerTop,
      inputPanelLeft: containerLeft,
      inputPanelTop: containerTop,
      outputPanelLeft: containerLeft + panelWidth + gapWidth,
      outputPanelTop: containerTop,
      chainCenterX: canvasWidth / 2,
      chainCenterY: canvasHeight / 2,
    };
  }

  if (
    canvasWidth >= compactMinCanvasWidth &&
    canvasHeight >= compactMinCanvasHeight
  ) {
    const baseTotalWidth = basePanelWidth * 2 + baseGap;
    const scale = Math.min(
      availableWidth / baseTotalWidth,
      availableHeight / basePanelHeight,
      1,
    );
    const gapWidth = clamp(Math.round(baseGap * scale), compactMinGap, baseGap);
    const maxPanelWidth = Math.max((availableWidth - gapWidth) / 2, 0);
    const panelWidth = clamp(
      Math.round(basePanelWidth * scale),
      Math.min(compactMinPanelWidth, maxPanelWidth),
      Math.min(basePanelWidth, maxPanelWidth),
    );
    const maxPanelHeight = Math.min(basePanelHeight, availableHeight);
    const panelHeight = clamp(
      Math.round(basePanelHeight * scale),
      Math.min(compactMinPanelHeight, maxPanelHeight),
      maxPanelHeight,
    );
    const containerWidth = panelWidth * 2 + gapWidth;
    const containerHeight = panelHeight;
    const containerLeft = getSafeCenteredPosition(
      canvasWidth,
      containerWidth,
      safePaddingX,
    );
    const containerTop = getSafeCenteredPosition(
      canvasHeight,
      containerHeight,
      safePaddingY,
    );

    return {
      canvasWidth,
      canvasHeight,
      mode: "compact",
      panelWidth,
      panelHeight,
      gapWidth,
      containerWidth,
      containerHeight,
      containerLeft,
      containerTop,
      inputPanelLeft: containerLeft,
      inputPanelTop: containerTop,
      outputPanelLeft: containerLeft + panelWidth + gapWidth,
      outputPanelTop: containerTop,
      chainCenterX: canvasWidth / 2,
      chainCenterY: canvasHeight / 2,
    };
  }

  const panelWidth = Math.max(
    0,
    Math.min(availableWidth, stackedMaxPanelWidth),
  );
  const effectiveStackedGap =
    availableHeight > stackedGap ? stackedGap : Math.max(availableHeight, 0);
  const rawPanelHeight = Math.floor(
    (availableHeight - effectiveStackedGap) / 2,
  );
  const panelHeightCandidate = clamp(
    rawPanelHeight,
    stackedMinPanelHeight,
    stackedMaxPanelHeight,
  );
  const panelHeight =
    panelHeightCandidate * 2 + effectiveStackedGap > availableHeight
      ? Math.max(rawPanelHeight, 0)
      : panelHeightCandidate;
  const containerWidth = panelWidth;
  const containerHeight = panelHeight * 2 + effectiveStackedGap;
  const containerLeft = getSafeCenteredPosition(
    canvasWidth,
    containerWidth,
    safePaddingX,
  );
  const containerTop = getSafeCenteredPosition(
    canvasHeight,
    containerHeight,
    safePaddingY,
  );

  return {
    canvasWidth,
    canvasHeight,
    mode: "stacked",
    panelWidth,
    panelHeight,
    gapWidth: effectiveStackedGap,
    containerWidth,
    containerHeight,
    containerLeft,
    containerTop,
    inputPanelLeft: containerLeft,
    inputPanelTop: containerTop,
    outputPanelLeft: containerLeft,
    outputPanelTop: containerTop + panelHeight + effectiveStackedGap,
    chainCenterX: canvasWidth / 2,
    chainCenterY: canvasHeight / 2,
  };
};

export const useDualPanelLayout = (targetId = EDITOR_CANVAS_AREA_ID) => {
  const [targetSize, setTargetSize] = useState<LayoutTargetSize | null>(null);

  useEffect(() => {
    const updateTargetSize = () => {
      setTargetSize(readTargetSize(targetId));
    };

    updateTargetSize();

    const target = document.getElementById(targetId);
    if (!target) {
      window.addEventListener("resize", updateTargetSize);
      return () => {
        window.removeEventListener("resize", updateTargetSize);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateTargetSize();
    });

    resizeObserver.observe(target);
    window.addEventListener("resize", updateTargetSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTargetSize);
    };
  }, [targetId]);

  return useMemo(() => getDualPanelLayout(targetSize), [targetSize]);
};
