import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65_535);

const productIdList = z
  .string()
  .transform((raw) => raw.split(',').map((part) => part.trim()).filter((part) => part !== ''))
  .pipe(z.array(z.string().regex(/^[1-9]\d*$/, 'must be comma-separated positive integers').transform(Number)).min(1));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: port.default(3000),
    PRODUCT_API_BASE_URL: z.url({ protocol: /^https?$/ }).default('https://fakestoreapi.com'),
    FEATURED_PRODUCT_IDS: productIdList.optional(),
    FEATURED_COUNT: z.coerce.number().int().min(1).max(20).default(5),
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: port.default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.email().default('catalogue@example.test'),
    SALES_INBOX: z.email().default('sales@example.test'),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
  })
  .refine((env) => (env.SMTP_USER === undefined) === (env.SMTP_PASS === undefined), {
    path: ['SMTP_USER'],
    message: 'SMTP_USER and SMTP_PASS must be set together',
    // Run even when other fields are invalid, so every problem is reported at once.
    when: () => true,
  });

type Env = z.infer<typeof envSchema>;

export interface Config {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly port: number;
  readonly productApi: { readonly baseUrl: string };
  readonly featured: { readonly productIds: readonly number[] | undefined; readonly count: number };
  readonly smtp: {
    readonly host: string;
    readonly port: number;
    readonly auth: { readonly user: string; readonly pass: string } | undefined;
  };
  readonly mail: { readonly from: string; readonly salesInbox: string };
  /** Max enquiries per minute per client IP. */
  readonly enquiryRateLimitMax: number;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Parses and validates env vars. Throws ConfigError listing every problem (never the values). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(withoutBlankValues(env));
  if (!result.success) {
    throw new ConfigError(formatIssues(result.error.issues));
  }
  return toConfig(result.data);
}

/** Treats `FOO=` in an env file the same as an unset variable, so defaults apply. */
function withoutBlankValues(env: NodeJS.ProcessEnv): Record<string, string> {
  const entries = Object.entries(env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1].trim() !== '',
  );
  return Object.fromEntries(entries);
}

function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  // Report the env var name only (not e.g. "FEATURED_PRODUCT_IDS.1"): that is what the user edits.
  const lines = issues.map((issue) => `  - ${String(issue.path[0] ?? '(root)')}: ${issue.message}`);
  return ['Invalid environment configuration:', ...lines].join('\n');
}

function toConfig(env: Env): Config {
  const auth =
    env.SMTP_USER !== undefined && env.SMTP_PASS !== undefined
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    productApi: { baseUrl: env.PRODUCT_API_BASE_URL },
    featured: { productIds: env.FEATURED_PRODUCT_IDS, count: env.FEATURED_COUNT },
    smtp: { host: env.SMTP_HOST, port: env.SMTP_PORT, auth },
    mail: { from: env.MAIL_FROM, salesInbox: env.SALES_INBOX },
    enquiryRateLimitMax: env.RATE_LIMIT_MAX,
  };
}
