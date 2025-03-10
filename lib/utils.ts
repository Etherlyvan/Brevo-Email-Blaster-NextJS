// lib/utils.ts
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseString } from 'xml2js';
import { NextRequest } from 'next/server';

/**
 * Combines class names with Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Define type alias for date-like inputs
type DateLike = Date | string | null | undefined;

/**
 * Formats a date to a readable string
 */
export function formatDate(date: DateLike): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a date and time
 */
export function formatDateTime(date: DateLike): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Create a more specific error type
interface ErrorWithMessage {
  message?: string;
  error?: string | { [key: string]: unknown };
  status?: number;
}

/**
 * Extract error message from API response
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  const typedError = error as ErrorWithMessage;
  
  if (typedError?.message) return typedError.message;
  if (typeof typedError?.error === 'string') return typedError.error;
  if (typedError?.error && typeof typedError.error === 'object') {
    return JSON.stringify(typedError.error);
  }
  
  return 'An unknown error occurred';
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  // Use a more comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return email.length <= 254 && emailRegex.test(email);
}

// Define a type for XML parsing result
type XmlParseResult = Record<string, unknown>;

/**
 * Parse XML to JSON (useful for some API responses)
 */
export async function parseXmlToJson(xml: string): Promise<XmlParseResult> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false }, (err: Error | null, result: XmlParseResult) => {
      if (err) {
        reject(new Error(`XML parsing failed: ${err.message}`));
      } else {
        resolve(result);
      }
    });
  });
}

// Define a type for SMTP error
interface SmtpErrorDetail {
  code?: string;
  message: string;
}

/**
 * Extract SMTP error details from error response
 */
export function extractSmtpError(error: unknown): SmtpErrorDetail {
  // Handle Nodemailer error format
  const typedError = error as { response?: string; message?: string };
  
  if (typedError?.response) {
    const regex = /(\d+)\s+(.*)/;
    const match = regex.exec(typedError.response);
    if (match) {
      return {
        code: match[1],
        message: match[2] ?? typedError.message ?? 'Unknown SMTP error',
      };
    }
  }
  
  return {
    message: extractErrorMessage(error),
  };
}

/**
 * Get base URL for the application (useful for callbacks and links)
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // For server-side
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

/**
 * Get query parameters from a NextRequest
 */
export function getQueryParams(req: NextRequest): Record<string, string> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Extract parameters from HTML template
 */
export function extractTemplateParameters(html: string): string[] {
  if (!html) return [];
  
  const paramRegex = /{{([^{}]+)}}/g;
  let match: RegExpExecArray | null;
  const parameters: string[] = [];
  
  while ((match = paramRegex.exec(html)) !== null) {
    parameters.push(match[1].trim());
  }
  
  return [...new Set(parameters)];
}

// Define more specific types for function arguments
type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Debounce function for input handlers
 */
export function debounce<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Safely serialize a date object or value to an ISO string
 * Helps prevent hydration errors by ensuring consistent date formats
 */
export function serializeDate(date: DateLike): string | null {
  if (!date) return null;
  
  try {
    if (typeof date === 'string') {
      // Try to parse the string to a Date first to ensure it's valid
      return new Date(date).toISOString();
    }
    
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely format a date for display - should only be used on client components
 */
export function formatDisplayDate(date: DateLike): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj instanceof Date ? dateObj.toLocaleString() : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: DateLike): string {
  if (!date) return 'N/A';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return formatDate(d);
    }
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a file size in a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a random string (useful for IDs)
 */
export function generateRandomString(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = chars.length;
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * Validate and sanitize email to avoid punycode issues
 */
export function validateEmail(email: string): boolean {
  // Fix control character in regex by using a standard ASCII-only regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email to avoid punycode issues
 */
export function sanitizeEmail(email: string): string {
  // Use a properly escaped ASCII range without control characters
  return email.replace(/[^\x20-\x7E]/g, '');
}

/**
 * Safely handle async operations with proper error handling
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage = 'Operation failed'
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Create a consistent API error response
 */
export function createApiError(message: string, status = 400): { error: string; status: number } {
  return {
    error: message,
    status
  };
}

/**
 * Sleep function for adding delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): { error: string; status: number } {
  console.error('API error:', error);
  
  if (error instanceof Error) {
    return { 
      error: error.message || 'An unexpected error occurred', 
      status: 500 
    };
  }
  
  return { 
    error: 'An unknown error occurred', 
    status: 500 
  };
}

// Define a more specific return type
type ThrottledFunction<T extends (...args: unknown[]) => unknown> = 
  (...args: Parameters<T>) => ReturnType<T> | undefined;

/**
 * Create a throttled function that only invokes func at most once per wait period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ThrottledFunction<T> {
  let lastCall = 0;
  let lastResult: ReturnType<T> | undefined;
  
  return function(...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    
    if (now - lastCall >= wait) {
      lastCall = now;
      // Use type assertion to ensure compatibility
      lastResult = func(...args) as ReturnType<T>;
    }
    
    return lastResult;
  };
}

/**
 * Capitalize the first letter of a string
 */
export function capitalizeFirstLetter(string: string): string {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Format campaign status for display
 */
export function formatCampaignStatus(status: string): string {
  return capitalizeFirstLetter(status);
}

/**
 * Get CSS class for campaign status badge
 */
export function getCampaignStatusClass(status: string): string {
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'queued':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Calculate percentage safely (avoiding division by zero)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Check if an object is empty
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Split an array into chunks of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (!array.length) return [];
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Define a type for task functions
type TaskFunction<T> = () => Promise<T>;

/**
 * Limit concurrent promises execution
 */
export async function limitConcurrency<T>(
  tasks: TaskFunction<T>[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const running: Promise<void>[] = [];
  
  for (const task of tasks) {
    const p = Promise.resolve().then(async () => {
      const result = await task();
      results.push(result);
    });
    
    running.push(p);
    
    if (running.length >= concurrency) {
      await Promise.race(running);
    }
  }
  
  await Promise.all(running);
  return results;
}

/**
 * Return a promise that resolves after the specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Define retry options interface
interface RetryOptions {
  retries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Create a retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    retries = 3, 
    delay: baseDelay = 1000, 
    backoff = true,
    onRetry = () => {} 
  } = options;
  
  let attempt = 0;
  let lastError = new Error("Unknown error"); // Initialize with default error
  
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;
      
      if (attempt >= retries) {
        break;
      }
      
      onRetry(attempt, lastError);
      
      // Calculate delay with exponential backoff if enabled
      const delayTime = backoff ? baseDelay * Math.pow(2, attempt - 1) : baseDelay;
      await delay(delayTime);
    }
  }
  
  throw lastError; // Now we know lastError is always an Error object
}