/** Parse pagination params from request. Returns undefined if not paginated. */
export function parsePaginationParams(req: { query: Record<string, unknown> }): { limit: number; offset: number } | undefined {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  if (limit == null || limit <= 0) return undefined;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  return { limit, offset };
}

export const PAGE_SIZE_OPTIONS = [10, 50, 100, 500];
