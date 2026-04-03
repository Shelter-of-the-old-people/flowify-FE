/**
 * Data shapes that can flow between nodes.
 * If a node's output matches a downstream node's input, the edge is allowed.
 */
export type DataType =
  | "file-list"
  | "single-file"
  | "text"
  | "spreadsheet"
  | "email-list"
  | "single-email"
  | "schedule-data"
  | "api-response";

/**
 * Returns whether two nodes are compatible based on their I/O types.
 * Empty input/output arrays mean the node has no type constraint.
 */
export const isDataTypeCompatible = (
  sourceOutput: DataType[],
  targetInput: DataType[],
): boolean => {
  if (sourceOutput.length === 0 || targetInput.length === 0) {
    return true;
  }

  return sourceOutput.some((type) => targetInput.includes(type));
};
