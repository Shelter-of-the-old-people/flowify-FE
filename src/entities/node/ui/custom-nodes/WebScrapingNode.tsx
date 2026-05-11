import { Text } from "@chakra-ui/react";
import { type Node, type NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import { type FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

const WEB_SCRAPING_SOURCE_MODE_LABELS: Record<string, string> = {
  course_files: "특정 과목 강의자료 전체",
  course_new_file: "과목의 새 강의자료",
  article_search: "네이버 뉴스 검색",
  new_articles: "네이버 새 기사",
  seboard_new_posts: "SE Board 새 글",
  seboard_posts: "SE Board 게시글",
  term_all_files: "학기 전체 과목 자료",
  website_feed: "RSS 지원 사이트",
};

const getWebScrapingSummary = (config: FlowNodeData["config"]) => {
  const typedConfig = getTypedConfig("web-scraping", config);

  if (typedConfig.service) {
    const parts = [
      typedConfig.source_mode
        ? (WEB_SCRAPING_SOURCE_MODE_LABELS[typedConfig.source_mode] ??
          typedConfig.source_mode)
        : null,
      typedConfig.target ? `대상: ${typedConfig.target}` : null,
    ].filter((value): value is string => Boolean(value));

    if (parts.length > 0) {
      return parts.join(" / ");
    }
  }

  if (typedConfig.targetUrl) {
    return typedConfig.targetUrl;
  }

  return "URL 미설정";
};

export const WebScrapingNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) => {
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{getWebScrapingSummary(data.config)}</Text>
    </BaseNode>
  );
};
