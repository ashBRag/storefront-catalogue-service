import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config/env.ts';

describe('loadConfig', () => {
  it('applies safe local defaults when nothing is set', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      nodeEnv: 'development',
      port: 3000,
      productApi: { baseUrl: 'https://fakestoreapi.com' },
      featured: { productIds: undefined, count: 5 },
      smtp: { host: 'localhost', port: 1025, auth: undefined },
      mail: { from: 'catalogue@example.test', salesInbox: 'sales@example.test' },
      enquiryRateLimitMax: 5,
    });
  });

  it('treats blank values as unset', () => {
    const config = loadConfig({ PORT: '', FEATURED_PRODUCT_IDS: '  ' });

    expect(config.port).toBe(3000);
    expect(config.featured.productIds).toBeUndefined();
  });

  it('parses comma-separated featured product ids in order', () => {
    const config = loadConfig({ FEATURED_PRODUCT_IDS: '9, 1,14,,3' });

    expect(config.featured.productIds).toEqual([9, 1, 14, 3]);
  });

  it('groups SMTP credentials when both are set', () => {
    const config = loadConfig({ SMTP_USER: 'user', SMTP_PASS: 'secret' });

    expect(config.smtp.auth).toEqual({ user: 'user', pass: 'secret' });
  });

  it.each([
    ['PORT', { PORT: 'abc' }],
    ['PORT', { PORT: '70000' }],
    ['NODE_ENV', { NODE_ENV: 'staging' }],
    ['PRODUCT_API_BASE_URL', { PRODUCT_API_BASE_URL: 'ftp://example.com' }],
    ['FEATURED_PRODUCT_IDS', { FEATURED_PRODUCT_IDS: '1,two,3' }],
    ['FEATURED_COUNT', { FEATURED_COUNT: '0' }],
    ['SALES_INBOX', { SALES_INBOX: 'not-an-email' }],
    ['SMTP_USER', { SMTP_USER: 'user' }],
  ])('rejects an invalid %s with a readable error', (name, env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(new RegExp(`^Invalid environment configuration:\\n  - ${name}: `));
  });

  it('lists every problem at once without echoing values', () => {
    const run = (): unknown => loadConfig({ PORT: 'abc', SMTP_PASS: 'super-secret' });

    expect(run).toThrow(/PORT: [\s\S]*SMTP_USER: SMTP_USER and SMTP_PASS must be set together/);
    expect(run).not.toThrow(/super-secret/);
  });
});
