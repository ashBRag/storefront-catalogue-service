import type { FastifyPluginAsync } from 'fastify';
import type { EnquiryService } from '../../services/EnquiryService.ts';
import { enquiryBody, parseInput, type EnquiryResponse } from '../schemas.ts';

export interface EnquiryRoutesOptions {
  readonly enquiries: EnquiryService;
  /** Max requests per minute per client IP. */
  readonly rateLimitMax: number;
}

/** Enquiries are small: reject anything bigger before parsing. */
const BODY_LIMIT_BYTES = 16 * 1024;

export const enquiryRoutes: FastifyPluginAsync<EnquiryRoutesOptions> = async (app, { enquiries, rateLimitMax }) => {
  app.post<{ Reply: EnquiryResponse }>(
    '/api/enquiries',
    {
      bodyLimit: BODY_LIMIT_BYTES,
      config: { rateLimit: { max: rateLimitMax, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { productId, name, email, phone, message } = parseInput(enquiryBody, request.body);
      await enquiries.submit({ productId, name, email, phone, message });
      return reply.status(201).send({ ok: true });
    },
  );
};
