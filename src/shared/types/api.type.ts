interface BaseResponse {
  success: boolean;
  message: string | null;
  errorCode: string | null;
}

interface SuccessResponse<T> extends BaseResponse {
  success: true;
  data: T;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  errorCode: string;
  message: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last?: boolean;
};

export interface ValidationWarning {
  nodeId: string;
  message: string;
  sourceType: string;
  targetType: string;
}
