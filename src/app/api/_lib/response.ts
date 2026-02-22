import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/app/lib/types/user';

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json<ApiResponse<T>>({ data, error: null }, { status });

export const err = (message: string, code: string, status: number) =>
  NextResponse.json<ApiResponse<null>>({ data: null, error: { message, code } }, { status });

export const unauthorized = (msg = 'Unauthorized') => err(msg, 'UNAUTHORIZED', 401);
export const forbidden = (msg = 'Forbidden') => err(msg, 'FORBIDDEN', 403);
export const notFound = (msg = 'Not found') => err(msg, 'NOT_FOUND', 404);
export const badRequest = (msg: string) => err(msg, 'BAD_REQUEST', 400);
export const serverError = (msg = 'Internal server error') => err(msg, 'INTERNAL_ERROR', 500);
