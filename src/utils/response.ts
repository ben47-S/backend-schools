/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T = any> extends ApiSuccessResponse<T> {
  pagination: PaginationMeta;
}

/**
 * Send a standardized success response
 */
export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a standardized error response
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): Response {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 */
export function paginatedResponse<T>(
  res: Response,
  data: T,
  pagination: PaginationMeta,
  message?: string
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
  };

  if (message) {
    response.message = message;
  }

  return res.status(200).json(response);
}
