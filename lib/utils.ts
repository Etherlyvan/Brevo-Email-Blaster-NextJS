import { NextRequest } from 'next/server';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseString } from 'xml2js';

/**
 * Combines class names with Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
}

// Create a more specific error type
type ErrorWithMessage = {
  message?: string;
  error?: string | { [key: string]: unknown };
};

/**
 * Extract error message from API response
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  const typedError = error as ErrorWithMessage;
  
  if (typedError?.message) return typedError.message;
  if (typedError?.error) {
    return typeof typedError.error === 'string' 
      ? typedError.error 
      : JSON.stringify(typedError.error);
  }
  return 'An unknown error occurred';
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
    const match = typedError.response.match(/(\d+)\s+(.*)/);
    if (match) {
      return {
        code: match[1],
        message: match[2] || typedError.message || 'Unknown SMTP error',
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
  
  // Using nullish coalescing instead of logical OR
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
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Extract parameters from HTML template
 */
export function extractTemplateParameters(html: string): string[] {
  const paramRegex = /{{([^{}]+)}}/g;
  const matches = [...html.matchAll(paramRegex)];
  return [...new Set(matches.map(match => match[1].trim()))];
}

// Define a more specific type for the debounce function
type DebouncedFunction<T extends (...args: unknown[]) => void> = (...args: Parameters<T>) => void;

/**
 * Debounce function for input handlers
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


/**
 * Validate email address format without using punycode
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
  
  /**
   * Sanitize email address to avoid punycode issues
   */
  export function sanitizeEmail(email: string): string {
    return email.replace(/[^\x00-\x7F]/g, '');
  }

  // lib/utils.ts (tambahkan jika belum ada)