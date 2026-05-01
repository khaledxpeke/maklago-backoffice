export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody | Record<string, unknown>) {
    const msg =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as ApiErrorBody).error?.message === 'string'
        ? (body as ApiErrorBody).error.message
        : `HTTP ${status}`;
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
