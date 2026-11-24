import { vi } from 'vitest';
import * as catalogue from '../api/catalogue.ts';

/**
 * Gives every mocked API function a harmless default, so navigating to any page
 * in a test never hits an unmocked function. Call in beforeEach after
 * `vi.mock('…/api/catalogue.ts')`, then override per test.
 */
export function mockApiDefaults(): void {
  vi.mocked(catalogue.getCategories).mockReset().mockResolvedValue([]);
  vi.mocked(catalogue.getFeatured).mockReset().mockResolvedValue([]);
  vi.mocked(catalogue.getCategoryProducts).mockReset().mockResolvedValue({ topRated: [], others: [] });
  vi.mocked(catalogue.searchProducts).mockReset().mockResolvedValue([]);
  vi.mocked(catalogue.getProduct).mockReset().mockReturnValue(new Promise(() => {}));
  vi.mocked(catalogue.submitEnquiry).mockReset().mockResolvedValue({ ok: true });
}
