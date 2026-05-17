import { describe, expect, it } from "vitest";

import { dualPanelLayoutSpec } from "@/shared/styles";

import { getDualPanelLayout } from "./dual-panel-layout";

const expectPanelWithinSafeArea = (
  layout: ReturnType<typeof getDualPanelLayout>,
) => {
  const { safePaddingX, safePaddingY } = dualPanelLayoutSpec;
  const rightBoundary = layout.canvasWidth - safePaddingX;
  const bottomBoundary = layout.canvasHeight - safePaddingY;

  expect(layout.inputPanelLeft).toBeGreaterThanOrEqual(safePaddingX);
  expect(layout.outputPanelLeft).toBeGreaterThanOrEqual(safePaddingX);
  expect(layout.inputPanelLeft + layout.panelWidth).toBeLessThanOrEqual(
    rightBoundary,
  );
  expect(layout.outputPanelLeft + layout.panelWidth).toBeLessThanOrEqual(
    rightBoundary,
  );
  expect(layout.inputPanelTop).toBeGreaterThanOrEqual(safePaddingY);
  expect(layout.outputPanelTop).toBeGreaterThanOrEqual(safePaddingY);
  expect(layout.inputPanelTop + layout.panelHeight).toBeLessThanOrEqual(
    bottomBoundary,
  );
  expect(layout.outputPanelTop + layout.panelHeight).toBeLessThanOrEqual(
    bottomBoundary,
  );
};

describe("getDualPanelLayout", () => {
  it.each([
    { height: 768, width: 1366 },
    { height: 800, width: 1440 },
    { height: 900, width: 1920 },
    { height: 1440, width: 2560 },
    { height: 614, width: 1093 },
  ])(
    "keeps panels inside the editor safe area at $width x $height",
    (targetSize) => {
      const layout = getDualPanelLayout(targetSize);

      expectPanelWithinSafeArea(layout);
    },
  );
});
