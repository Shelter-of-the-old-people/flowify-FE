type GoogleSheetsOptionLike = {
  id: string;
  metadata: Record<string, unknown>;
};

const SHEET_OPTION_DELIMITER = "::sheet::";

const getMetadataString = (
  metadata: Record<string, unknown>,
  key: string,
): string | null => {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

export const buildGoogleSheetsSheetOptionId = (
  spreadsheetId: string,
  sheetName: string,
) => `${spreadsheetId}${SHEET_OPTION_DELIMITER}${sheetName}`;

export const getGoogleSheetsSpreadsheetId = (
  option: GoogleSheetsOptionLike,
): string => getMetadataString(option.metadata, "spreadsheetId") ?? option.id;

export const getGoogleSheetsSheetName = (
  option: GoogleSheetsOptionLike,
): string | null => getMetadataString(option.metadata, "sheetName");

export const getGoogleSheetsSelectedSheetOptionId = ({
  spreadsheetId,
  sheetName,
}: {
  spreadsheetId: string;
  sheetName: string;
}) => {
  const trimmedSpreadsheetId = spreadsheetId.trim();
  const trimmedSheetName = sheetName.trim();

  if (!trimmedSpreadsheetId) {
    return "";
  }

  if (!trimmedSheetName) {
    return trimmedSpreadsheetId;
  }

  return buildGoogleSheetsSheetOptionId(trimmedSpreadsheetId, trimmedSheetName);
};
