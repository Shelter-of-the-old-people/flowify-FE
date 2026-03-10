export type ApiResponse<T> = {
  data: T;
  status: string;
  serverDateTime: string;
  errorCode: string | null;
  errorMessage: string | null;
};
