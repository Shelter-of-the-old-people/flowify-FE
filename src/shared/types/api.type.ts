export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
  errorCode: string | null;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export interface ValidationWarning {
  nodeId: string;
  message: string;
  sourceType: string;
  targetType: string;
}
