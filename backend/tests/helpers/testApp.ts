import { InMemoryEmailSender } from '../../src/adapters/InMemoryEmailSender.ts';
import { InMemoryProductSource } from '../../src/adapters/InMemoryProductSource.ts';
import { buildApp, type AppDeps } from '../../src/app.ts';

/** Builds the app with in-memory adapters and quiet logging; override any dep. */
export function buildTestApp(overrides: Partial<AppDeps> = {}) {
  const emailSender = new InMemoryEmailSender();
  const app = buildApp({
    logger: false,
    productSource: new InMemoryProductSource(),
    catalogue: { featuredProductIds: undefined, featuredCount: 5 },
    emailSender,
    enquiries: { from: 'catalogue@example.test', salesInbox: 'sales@example.test', rateLimitMax: 100 },
    ...overrides,
  });
  return { app, emailSender };
}
