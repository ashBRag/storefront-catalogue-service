// Display formatting. Presentation only, so it lives in the UI layer.

/**
 * ASSUMPTION: prices from the backend are US dollars. Fake Store gives no currency,
 * and the backend contract has none. Change this one constant if that changes.
 */
export const PRICE_CURRENCY = 'USD';
/** Fixed locale so prices look the same for every visitor (and in tests). */
const PRICE_LOCALE = 'en-US';

const priceFormatter = new Intl.NumberFormat(PRICE_LOCALE, { style: 'currency', currency: PRICE_CURRENCY });
const rateFormatter = new Intl.NumberFormat(PRICE_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const countFormatter = new Intl.NumberFormat(PRICE_LOCALE);

/** Category names come lower-case from the API; capitalise the first letter for titles. */
export function formatCategory(category: string): string {
  return category.charAt(0).toLocaleUpperCase(PRICE_LOCALE) + category.slice(1);
}

export function formatPrice(price: number): string {
  return priceFormatter.format(price);
}

export function formatRate(rate: number): string {
  return rateFormatter.format(rate);
}

export function formatCount(count: number): string {
  return countFormatter.format(count);
}
