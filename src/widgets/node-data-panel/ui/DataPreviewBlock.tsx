import { type ReactNode } from "react";

import { Box, Link, Text } from "@chakra-ui/react";

import { getDataTypeDisplayLabel } from "@/entities";

type Props = {
  title?: string;
  data: unknown;
};

type DataRecord = Record<string, unknown>;

const MAX_TEXT_PREVIEW_LENGTH = 1400;
const MAX_LIST_PREVIEW_COUNT = 12;
const MAX_TABLE_ROW_COUNT = 12;

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getRecordItems = (value: unknown) =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const getPayloadType = (data: unknown) =>
  isRecord(data) ? getString(data.type).toUpperCase() : "";

const truncateText = (value: string, maxLength = MAX_TEXT_PREVIEW_LENGTH) =>
  value.length > maxLength
    ? `${value.slice(0, maxLength).trimEnd()}...`
    : value;

const formatDateTime = (value: unknown) => {
  const rawValue = getString(value);
  if (!rawValue) {
    return "";
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatFileSize = (value: unknown) => {
  const numericValue =
    getNumber(value) ?? (getString(value) ? Number(getString(value)) : null);

  if (numericValue === null || !Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue < 1024) {
    return `${numericValue} B`;
  }

  if (numericValue < 1024 * 1024) {
    return `${(numericValue / 1024).toFixed(1)} KB`;
  }

  return `${(numericValue / (1024 * 1024)).toFixed(1)} MB`;
};

const getDisplayTypeLabel = (type: string) =>
  getDataTypeDisplayLabel(type) ?? "데이터";

const FieldText = ({ label, value }: { label: string; value: unknown }) => {
  const displayValue =
    typeof value === "number" ? String(value) : getString(value);

  if (!displayValue) {
    return null;
  }

  return (
    <Text fontSize="xs" color="text.secondary">
      {label}: {displayValue}
    </Text>
  );
};

const ExternalLink = ({ href }: { href: unknown }) => {
  const value = getString(href);
  if (!value) {
    return null;
  }

  return (
    <Link
      href={value}
      target="_blank"
      rel="noreferrer"
      color="blue.500"
      fontSize="xs"
      fontWeight="medium"
    >
      원본 열기
    </Link>
  );
};

const SummaryCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) => (
  <Box
    px={4}
    py={3}
    borderRadius="xl"
    bg="gray.50"
    border="1px solid"
    borderColor="gray.100"
  >
    <Text fontSize="sm" fontWeight="semibold">
      {title}
    </Text>
    {description ? (
      <Text color="text.secondary" fontSize="sm" mt={1} whiteSpace="pre-wrap">
        {description}
      </Text>
    ) : null}
    {children ? (
      <Box display="flex" flexDirection="column" gap={1} mt={3}>
        {children}
      </Box>
    ) : null}
  </Box>
);

const FileItemCard = ({ item, index }: { item: DataRecord; index: number }) => {
  const filename = getString(item.filename) || `파일 ${index + 1}`;
  const mimeType = getString(item.mime_type) || getString(item.mimeType);
  const size = formatFileSize(item.size);

  return (
    <Box
      px={4}
      py={3}
      borderRadius="xl"
      bg="white"
      border="1px solid"
      borderColor="gray.100"
    >
      <Text fontSize="sm" fontWeight="semibold" wordBreak="break-word">
        {filename}
      </Text>
      <Box mt={1} display="flex" flexDirection="column" gap={1}>
        <FieldText label="형식" value={mimeType} />
        <FieldText label="크기" value={size} />
        <FieldText
          label="수정일"
          value={formatDateTime(item.modified_time ?? item.modifiedTime)}
        />
        <ExternalLink href={item.url} />
      </Box>
    </Box>
  );
};

const FileListPreview = ({ data }: { data: DataRecord }) => {
  const items = getRecordItems(data.items);
  const previewItems = items.slice(0, MAX_LIST_PREVIEW_COUNT);
  const omittedCount = items.length - previewItems.length;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard
        title={`${items.length}개 파일`}
        description={
          items.length > 0
            ? "다음 단계로 전달된 파일 목록입니다."
            : "전달된 파일이 없습니다."
        }
      />
      {previewItems.map((item, index) => (
        <FileItemCard
          key={`${getString(item.filename)}-${index}`}
          item={item}
          index={index}
        />
      ))}
      {omittedCount > 0 ? (
        <Text fontSize="xs" color="text.secondary">
          외 {omittedCount}개 파일은 미리보기에서 생략되었습니다.
        </Text>
      ) : null}
    </Box>
  );
};

const SingleFilePreview = ({ data }: { data: DataRecord }) => {
  const filename = getString(data.filename) || "파일";
  const content = getString(data.content);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard
        title={filename}
        description="다음 단계로 전달된 단일 파일입니다."
      >
        <FieldText label="형식" value={data.mime_type ?? data.mimeType} />
        <FieldText label="크기" value={formatFileSize(data.size)} />
        <FieldText
          label="생성일"
          value={formatDateTime(data.created_time ?? data.createdTime)}
        />
        <FieldText
          label="수정일"
          value={formatDateTime(data.modified_time ?? data.modifiedTime)}
        />
        <ExternalLink href={data.url} />
      </SummaryCard>
      {content ? (
        <SummaryCard
          title="본문 미리보기"
          description={truncateText(content)}
        />
      ) : null}
    </Box>
  );
};

const TextPreview = ({ data }: { data: DataRecord }) => {
  const content = getString(data.content);

  return (
    <SummaryCard
      title="텍스트"
      description={
        content ? truncateText(content) : "표시할 텍스트가 없습니다."
      }
    />
  );
};

const EmailItemCard = ({
  item,
  index,
}: {
  item: DataRecord;
  index: number;
}) => {
  const subject = getString(item.subject) || `메일 ${index + 1}`;
  const body = getString(item.body);

  return (
    <Box
      px={4}
      py={3}
      borderRadius="xl"
      bg="white"
      border="1px solid"
      borderColor="gray.100"
    >
      <Text fontSize="sm" fontWeight="semibold" wordBreak="break-word">
        {subject}
      </Text>
      <Box mt={1} display="flex" flexDirection="column" gap={1}>
        <FieldText label="보낸 사람" value={item.from} />
        <FieldText label="날짜" value={formatDateTime(item.date)} />
        {body ? (
          <Text fontSize="xs" color="text.secondary" whiteSpace="pre-wrap">
            {truncateText(body, 240)}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

const EmailListPreview = ({ data }: { data: DataRecord }) => {
  const items = getRecordItems(data.items);
  const previewItems = items.slice(0, MAX_LIST_PREVIEW_COUNT);
  const omittedCount = items.length - previewItems.length;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard
        title={`${items.length}개 메일`}
        description={
          items.length > 0
            ? "다음 단계로 전달된 메일 목록입니다."
            : "전달된 메일이 없습니다."
        }
      />
      {previewItems.map((item, index) => (
        <EmailItemCard
          key={`${getString(item.subject)}-${index}`}
          item={item}
          index={index}
        />
      ))}
      {omittedCount > 0 ? (
        <Text fontSize="xs" color="text.secondary">
          외 {omittedCount}개 메일은 미리보기에서 생략되었습니다.
        </Text>
      ) : null}
    </Box>
  );
};

const SingleEmailPreview = ({ data }: { data: DataRecord }) => {
  const attachments = getRecordItems(data.attachments);
  const body = getString(data.body);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard title={getString(data.subject) || "메일"}>
        <FieldText label="보낸 사람" value={data.from} />
        <FieldText label="날짜" value={formatDateTime(data.date)} />
        <FieldText
          label="첨부"
          value={attachments.length ? `${attachments.length}개` : ""}
        />
      </SummaryCard>
      {body ? (
        <SummaryCard title="본문" description={truncateText(body)} />
      ) : null}
      {attachments.length > 0 ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {attachments.slice(0, MAX_LIST_PREVIEW_COUNT).map((item, index) => (
            <FileItemCard
              key={`${getString(item.filename)}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

const SpreadsheetPreview = ({ data }: { data: DataRecord }) => {
  const headers = Array.isArray(data.headers)
    ? data.headers.map((header) => String(header))
    : [];
  const rows = Array.isArray(data.rows)
    ? data.rows
        .filter(Array.isArray)
        .map((row) => row.map((cell) => String(cell ?? "")))
    : [];
  const previewRows = rows.slice(0, MAX_TABLE_ROW_COUNT);
  const columnCount = Math.max(
    headers.length,
    ...previewRows.map((row) => row.length),
    1,
  );
  const displayHeaders =
    headers.length > 0
      ? headers
      : Array.from({ length: columnCount }, (_, index) => `열 ${index + 1}`);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard
        title={`${rows.length}개 행`}
        description={
          getString(data.sheet_name)
            ? `시트: ${getString(data.sheet_name)}`
            : "표 데이터입니다."
        }
      />
      <Box
        overflowX="auto"
        border="1px solid"
        borderColor="gray.100"
        borderRadius="xl"
      >
        <Box as="table" width="100%" minW="420px" borderCollapse="collapse">
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {displayHeaders.map((header, index) => (
                <Box
                  as="th"
                  key={`${header}-${index}`}
                  px={3}
                  py={2}
                  textAlign="left"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="gray.600"
                  borderBottom="1px solid"
                  borderColor="gray.100"
                >
                  {header}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {previewRows.map((row, rowIndex) => (
              <Box as="tr" key={`row-${rowIndex}`}>
                {displayHeaders.map((_, cellIndex) => (
                  <Box
                    as="td"
                    key={`cell-${rowIndex}-${cellIndex}`}
                    px={3}
                    py={2}
                    fontSize="xs"
                    color="gray.700"
                    borderTop={rowIndex === 0 ? "none" : "1px solid"}
                    borderColor="gray.100"
                  >
                    {row[cellIndex] ?? ""}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      {rows.length > previewRows.length ? (
        <Text fontSize="xs" color="text.secondary">
          외 {rows.length - previewRows.length}개 행은 미리보기에서
          생략되었습니다.
        </Text>
      ) : null}
    </Box>
  );
};

const SchedulePreview = ({ data }: { data: DataRecord }) => {
  const items = getRecordItems(data.items);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <SummaryCard
        title={`${items.length}개 일정`}
        description="다음 단계로 전달된 일정입니다."
      />
      {items.slice(0, MAX_LIST_PREVIEW_COUNT).map((item, index) => (
        <Box
          key={`${getString(item.title)}-${index}`}
          px={4}
          py={3}
          borderRadius="xl"
          bg="white"
          border="1px solid"
          borderColor="gray.100"
        >
          <Text fontSize="sm" fontWeight="semibold">
            {getString(item.title) || `일정 ${index + 1}`}
          </Text>
          <Box mt={1} display="flex" flexDirection="column" gap={1}>
            <FieldText label="시작" value={formatDateTime(item.start_time)} />
            <FieldText label="종료" value={formatDateTime(item.end_time)} />
            <FieldText label="장소" value={item.location} />
            <FieldText label="설명" value={item.description} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const ApiResponsePreview = ({ data }: { data: DataRecord }) => {
  const responseData = data.data;
  const itemCount =
    isRecord(responseData) && Array.isArray(responseData.items)
      ? responseData.items.length
      : null;

  return (
    <SummaryCard
      title="API 응답"
      description={
        itemCount !== null
          ? `${itemCount}개 항목이 포함된 응답입니다.`
          : "외부 서비스에서 받은 응답 데이터입니다."
      }
    >
      <FieldText label="출처" value={data.source} />
    </SummaryCard>
  );
};

const OutputPreview = ({ data }: { data: DataRecord }) => (
  <SummaryCard
    title="전송 예정 데이터"
    description="미리보기용 결과이며 실제 전송은 수행되지 않았습니다."
  >
    <FieldText label="서비스" value={data.service} />
    <FieldText label="작업" value={data.action} />
  </SummaryCard>
);

const GenericPreview = ({ data }: { data: unknown }) => {
  if (typeof data === "string") {
    return <SummaryCard title="텍스트" description={truncateText(data)} />;
  }

  if (Array.isArray(data)) {
    return (
      <SummaryCard
        title={`${data.length}개 항목`}
        description="목록 형태의 데이터입니다."
      />
    );
  }

  if (isRecord(data)) {
    const entries = Object.entries(data);

    return (
      <SummaryCard
        title="데이터 묶음"
        description={`${entries.length}개 항목으로 구성된 데이터입니다.`}
      />
    );
  }

  return (
    <SummaryCard
      title="데이터"
      description="표시할 수 있는 데이터가 있습니다."
    />
  );
};

const CanonicalPreview = ({ data }: { data: unknown }) => {
  if (!isRecord(data)) {
    return <GenericPreview data={data} />;
  }

  switch (getPayloadType(data)) {
    case "FILE_LIST":
      return <FileListPreview data={data} />;
    case "SINGLE_FILE":
      return <SingleFilePreview data={data} />;
    case "TEXT":
      return <TextPreview data={data} />;
    case "EMAIL_LIST":
      return <EmailListPreview data={data} />;
    case "SINGLE_EMAIL":
      return <SingleEmailPreview data={data} />;
    case "SPREADSHEET_DATA":
      return <SpreadsheetPreview data={data} />;
    case "SCHEDULE_DATA":
      return <SchedulePreview data={data} />;
    case "API_RESPONSE":
      return <ApiResponsePreview data={data} />;
    case "OUTPUT_PREVIEW":
      return <OutputPreview data={data} />;
    default:
      return <GenericPreview data={data} />;
  }
};

export const DataPreviewBlock = ({
  title = "데이터 미리보기",
  data,
}: Props) => {
  const payloadType = getPayloadType(data);
  const payloadLabel = payloadType ? getDisplayTypeLabel(payloadType) : null;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Text fontSize="md" fontWeight="bold">
          {title}
        </Text>
        {payloadLabel ? (
          <Text mt={1} fontSize="xs" color="text.secondary">
            {payloadLabel}
          </Text>
        ) : null}
      </Box>

      <CanonicalPreview data={data} />
    </Box>
  );
};
