type DataRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getBoolean = (value: unknown) => typeof value === "boolean" ? value : null;

export type SpreadsheetPreviewSummary = {
  omittedCount: number;
  totalRows: number;
};

export const getSpreadsheetPreviewSummary = ({
  data,
  displayedRowCount,
  rowCount,
}: {
  data: DataRecord;
  displayedRowCount: number;
  rowCount: number;
}): SpreadsheetPreviewSummary => {
  const metadata = isRecord(data.metadata) ? data.metadata : null;
  const metadataTotalRows = metadata ? getNumber(metadata.total_rows) : null;
  const metadataTruncated = metadata ? getBoolean(metadata.truncated) : null;
  const payloadTruncated = getBoolean(data.truncated);
  const totalRows = Math.max(metadataTotalRows ?? rowCount, rowCount);
  const isTruncated =
    payloadTruncated ?? metadataTruncated ?? totalRows > rowCount;
  const omittedCount = isTruncated
    ? Math.max(totalRows - displayedRowCount, 0)
    : Math.max(rowCount - displayedRowCount, 0);

  return {
    omittedCount,
    totalRows,
  };
};
