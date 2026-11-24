import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { buildApp } from './app.ts';
import { ConfigError, loadConfig, type Config } from './config/env.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildApp({ logger: loggerOptions(config) });
  closeOnSignals(app);
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  return { level: config.nodeEnv === 'production' ? 'info' : 'debug' };
}

function closeOnSignals(app: FastifyInstance): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      app.log.info({ signal }, 'shutting down');
      app.close().then(
        () => process.exit(0),
        (error: unknown) => {
          app.log.error({ err: error }, 'error during shutdown');
          process.exit(1);
        },
      );
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
});
