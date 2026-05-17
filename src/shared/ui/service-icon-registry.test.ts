import { describe, expect, it } from "vitest";

import { getServiceIconMetaFromService } from "./service-icon-registry";

describe("service icon registry", () => {
  it.each([
    ["google_drive", null, "google-drive"],
    ["google_sheets", null, "google-sheets"],
    ["google_calendar", null, "calendar"],
    ["canvas_lms", null, "canvas-lms"],
    ["naver_news", null, "naver-news"],
    ["discord", null, "discord"],
    ["notion", null, "notion"],
    ["github", null, "github"],
    ["web_news", "seboard_posts", "seboard"],
    ["web_news", "seboard_new_posts", "seboard"],
    ["web_news", "website_feed", "web-scraping"],
    ["web_news", null, "web-scraping"],
    ["unknown", null, "unknown"],
  ])(
    "normalizes %s with source mode %s to %s",
    (serviceKey, sourceMode, expectedKey) => {
      expect(getServiceIconMetaFromService(serviceKey, sourceMode).key).toBe(
        expectedKey,
      );
    },
  );

  it.each(["youtube", "coupang", "slack"])(
    "keeps future service %s out of the V1 registry",
    (serviceKey) => {
      expect(getServiceIconMetaFromService(serviceKey).key).toBe("unknown");
    },
  );
});
