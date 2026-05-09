import { type NodeConfig } from "@/entities/node";

export const FILE_TYPE_BRANCH_ACTION_ID = "branch_by_file_type";
export const FILE_TYPE_BRANCH_TARGET_HANDLE = "input";

export const FILE_TYPE_BRANCH_LABELS = {
  pdf: "PDF",
  image: "이미지",
  spreadsheet: "스프레드시트",
  document: "문서",
  presentation: "프레젠테이션",
  other: "기타",
} as const satisfies Record<string, string>;

export type FileTypeBranchKey = keyof typeof FILE_TYPE_BRANCH_LABELS;

type SelectionValue = string | string[];

const FILE_TYPE_BRANCH_KEYS = new Set<string>(
  Object.keys(FILE_TYPE_BRANCH_LABELS),
);

export const isFileTypeBranchAction = (
  value: string | null | undefined,
): value is typeof FILE_TYPE_BRANCH_ACTION_ID =>
  value === FILE_TYPE_BRANCH_ACTION_ID;

export const getFileTypeBranchLabel = (key: FileTypeBranchKey) =>
  FILE_TYPE_BRANCH_LABELS[key];

const addBranchKey = (keys: FileTypeBranchKey[], value: unknown) => {
  if (typeof value !== "string") {
    return;
  }

  const key = value.trim();
  if (!FILE_TYPE_BRANCH_KEYS.has(key)) {
    return;
  }

  if (!keys.includes(key as FileTypeBranchKey)) {
    keys.push(key as FileTypeBranchKey);
  }
};

const addBranchKeys = (keys: FileTypeBranchKey[], value: unknown) => {
  if (Array.isArray(value)) {
    value.forEach((item) => addBranchKeys(keys, item));
    return;
  }

  addBranchKey(keys, value);
};

export const toFileTypeBranchKeys = (
  selections: Record<string, SelectionValue> | null | undefined,
): FileTypeBranchKey[] => {
  const keys: FileTypeBranchKey[] = [];

  addBranchKeys(keys, selections?.branch_config);
  addBranchKeys(keys, selections?.[FILE_TYPE_BRANCH_ACTION_ID]);
  addBranchKeys(keys, selections?.branches);

  return keys;
};

export const toFileTypeBranchConfigPatch = (
  selections: Record<string, SelectionValue>,
): Partial<NodeConfig> | null => {
  const branchKeys = toFileTypeBranchKeys(selections);

  if (branchKeys.length === 0) {
    return null;
  }

  return {
    branchTypes: branchKeys,
    choiceSelections: {
      ...selections,
      branch_config: branchKeys,
      [FILE_TYPE_BRANCH_ACTION_ID]: branchKeys,
      branches: branchKeys,
    },
  } as Partial<NodeConfig>;
};

export const toFileTypeBranchInitialSelections = (
  selections: Record<string, SelectionValue> | null | undefined,
): Record<string, SelectionValue> | null => {
  const branchKeys = toFileTypeBranchKeys(selections);

  return branchKeys.length > 0 ? { branch_config: branchKeys } : null;
};
