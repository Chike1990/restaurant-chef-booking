/** RFC 7807 problem details. Every error the API returns has this shape. */
export class ProblemError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    override readonly message: string,
    readonly type = 'about:blank',
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ProblemError'
  }

  toProblem() {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.message,
      ...this.extra,
    }
  }
}

export const badRequest = (detail: string, extra?: Record<string, unknown>) =>
  new ProblemError(400, 'Bad Request', detail, 'about:blank', extra)
export const unauthorized = (detail = 'Authentication required') => new ProblemError(401, 'Unauthorized', detail)
export const forbidden = (detail = 'Not allowed') => new ProblemError(403, 'Forbidden', detail)
export const notFound = (detail: string) => new ProblemError(404, 'Not Found', detail)
export const conflict = (detail: string) => new ProblemError(409, 'Conflict', detail)
export const unprocessable = (detail: string, extra?: Record<string, unknown>) =>
  new ProblemError(422, 'Unprocessable Content', detail, 'about:blank', extra)
