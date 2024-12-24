export interface ApiResponse {
  status: string;
  requestId: string;
  data?: Record<string, any>;
  message: string;
}

export function createResponse(
  status: 'success' | 'error',
  requestId: string,
  message: string,
  data?: Record<string, any>,
): string {
  return JSON.stringify({ status, requestId, message, data });
}
