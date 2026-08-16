// CANONICAL API response helpers for RenewalRadar CE. Every route returns { data, error, code }.
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface Pagination {
  page: number;
  limit: number;
  from: number;
  to: number;
}

export function parsePagination(url: URL): Pagination {
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const rawOffset = Number.parseInt(url.searchParams.get('offset') ?? '', 10);
  let page: number;
  let from: number;
  if (Number.isFinite(rawOffset) && rawOffset >= 0) {
    // Support offset-based paging: derive page from offset/limit.
    from = rawOffset;
    page = Math.floor(rawOffset / limit) + 1;
  } else {
    const rawPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
    page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    from = (page - 1) * limit;
  }
  return { page, limit, from, to: from + limit - 1 };
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[] | undefined>,
): NextResponse {
  return NextResponse.json(
    { data: null, error: message, code, ...(details ? { details } : {}) },
    { status },
  );
}

export function failValidation(error: ZodError): NextResponse {
  const flattened = error.flatten();
  const formMessage = flattened.formErrors[0];
  return fail(
    400,
    'validation_failed',
    formMessage ?? 'Some fields need a quick fix before we can save this.',
    flattened.fieldErrors,
  );
}

export function failUnauthorized(): NextResponse {
  return fail(401, 'unauthorized', 'Please sign in to continue.');
}

export function failNotFound(message: string): NextResponse {
  return fail(404, 'not_found', message);
}

export function failRateLimited(): NextResponse {
  return fail(429, 'rate_limited', 'Too many requests for today. The counter resets tomorrow.');
}

export function handleRouteError(error: unknown, routeLabel: string): NextResponse {
  if (error instanceof ServiceError) {
    return fail(error.status, error.code, error.message);
  }
  console.error(`${routeLabel} failed`, error);
  return fail(500, 'server_error', 'Something hiccupped on our side. Please try again in a moment.');
}
