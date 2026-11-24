/**
 * The slice of a logger that services need. Fastify's pino logger satisfies it,
 * so services can log without importing Fastify or pino.
 */
export interface Logger {
  warn(details: Record<string, unknown>, message: string): void;
}
