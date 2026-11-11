import "server-only";
import crypto from "crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Explicit domain/validation error whose message is safe to display to end users.
 */
export class PublicAppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 400, code?: string) {
    super(message);
    this.name = "PublicAppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Logs unexpected errors to Sentry and returns a sanitized user-facing error message.
 */
export function toSafeErrorMessage(
  error: unknown,
  fallback: string = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau."
): string {
  if (error instanceof PublicAppError) {
    return error.message;
  }

  // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để giám sát lỗi runtime
  Sentry.captureException(error);
  return fallback;
}

/**
 * Helper for Server Actions returning { success: false, error, correlationId }.
 */
export function toSafeActionError(
  error: unknown,
  fallback: string = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau."
): { success: false; error: string; message?: string; correlationId: string } {
  const correlationId = crypto.randomUUID();
  if (error instanceof PublicAppError) {
    return {
      success: false,
      error: error.message,
      correlationId,
    };
  }

  // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) kèm correlationId
  Sentry.captureException(error, { extra: { correlationId } });
  return {
    success: false,
    error: fallback,
    correlationId,
  };
}

/**
 * Centralized API Route error handler that prevents leaking raw Prisma/SQL/stack trace details.
 */
export function handleApiError(
  error: unknown,
  fallback: string = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.",
  status: number = 500
) {
  const correlationId = crypto.randomUUID();

  if (error instanceof PublicAppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        correlationId,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    if (error.message.startsWith("Unauthorized:")) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tiếp tục.", correlationId },
        { status: 401 }
      );
    }
    if (error.message.startsWith("Forbidden:")) {
      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện thao tác này.", correlationId },
        { status: 403 }
      );
    }
  }

  // TODO: Tích hợp hệ thống tracking (Sentry/LogRocket) để theo dõi lỗi API theo correlationId
  Sentry.captureException(error, { extra: { correlationId } });

  return NextResponse.json(
    {
      error: fallback,
      correlationId,
    },
    { status }
  );
}
