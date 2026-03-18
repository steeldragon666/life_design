/**
 * Structured logger for the Life Design application.
 *
 * Replaces raw `console.log/warn/error` calls with a structured utility that:
 * - Prefixes messages with a category tag for easy filtering
 * - Suppresses debug-level logs in production
 * - Provides a consistent interface for future integration with external
 *   logging services (e.g., Sentry, Datadog, PostHog)
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('chat', 'Streaming response started');
 *   logger.warn('oauth', 'CSRF state mismatch', { userId });
 *   logger.error('stripe', 'Webhook verification failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatPrefix(level: LogLevel, category: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
}

export const logger = {
  debug(category: string, message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(formatPrefix('debug', category), message, ...args);
    }
  },

  info(category: string, message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatPrefix('info', category), message, ...args);
    }
  },

  warn(category: string, message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatPrefix('warn', category), message, ...args);
    }
  },

  error(category: string, message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatPrefix('error', category), message, ...args);
    }
  },
};

export default logger;
