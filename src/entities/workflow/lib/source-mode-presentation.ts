import { type SourceModeResponse } from "../api";

const WEB_NEWS_SERVICE_KEY = "web_news";
const SEBOARD_POSTS_MODE_KEY = "seboard_posts";
const SEBOARD_NEW_POSTS_MODE_KEY = "seboard_new_posts";
const SEBOARD_MODE_GROUP_KEY = "seboard_posts";

const SEBOARD_MODE_KEYS = new Set([
  SEBOARD_POSTS_MODE_KEY,
  SEBOARD_NEW_POSTS_MODE_KEY,
]);

export const shouldHideSourceModeFromPrimaryList = (
  serviceKey: string,
  modeKey: string,
) => serviceKey === WEB_NEWS_SERVICE_KEY && modeKey === SEBOARD_POSTS_MODE_KEY;

export const isSeBoardNewPostsSourceMode = (
  serviceKey: string,
  modeKey: string,
) =>
  serviceKey === WEB_NEWS_SERVICE_KEY && modeKey === SEBOARD_NEW_POSTS_MODE_KEY;

export const getPrimarySourceModeLabel = (
  serviceKey: string,
  mode: SourceModeResponse,
) => {
  if (
    serviceKey === WEB_NEWS_SERVICE_KEY &&
    mode.key === SEBOARD_NEW_POSTS_MODE_KEY
  ) {
    return "SE Board 새 글 가져오기";
  }

  if (
    serviceKey === WEB_NEWS_SERVICE_KEY &&
    mode.key === SEBOARD_POSTS_MODE_KEY
  ) {
    return "SE Board 게시글 가져오기";
  }

  return mode.label;
};

export const getSourceModeTargetScopeKey = (
  serviceKey: string | null,
  modeKey: string | null,
) => {
  if (
    serviceKey === WEB_NEWS_SERVICE_KEY &&
    modeKey &&
    SEBOARD_MODE_KEYS.has(modeKey)
  ) {
    return SEBOARD_MODE_GROUP_KEY;
  }

  return modeKey ?? "";
};
