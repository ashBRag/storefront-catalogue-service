import { ApiError } from './client.ts';

/**
 * A message that is safe and useful to show a customer. The backend's messages
 * are written for customers (internal details stay in its logs); anything else
 * gets a generic message.
 */
export function userMessage(error: Error): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
