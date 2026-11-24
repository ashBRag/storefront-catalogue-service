import { describe, expect, it } from 'vitest';
import { EMPTY_ENQUIRY, toEnquiryInput, validateEnquiry, type EnquiryValues } from './validation.ts';

const valid: EnquiryValues = { name: 'Ann Lee', email: 'ann@example.test', phone: '', message: '' };
const errorsFor = (patch: Partial<EnquiryValues>) => validateEnquiry({ ...valid, ...patch });

describe('validateEnquiry (mirrors the backend rules)', () => {
  it('accepts a minimal valid enquiry: name and email only', () => {
    expect(validateEnquiry(valid)).toEqual({});
  });

  it('requires name and email', () => {
    expect(validateEnquiry(EMPTY_ENQUIRY)).toEqual({ name: 'Enter your name', email: 'Enter your email address' });
    expect(errorsFor({ name: '   ' })).toHaveProperty('name');
  });

  it.each([
    ['name', { name: 'x'.repeat(101) }],
    ['email', { email: 'not-an-email' }],
    ['email', { email: 'a b@example.test' }],
    ['email', { email: `${'x'.repeat(250)}@example.test` }],
    ['phone', { phone: 'call me' }],
    ['phone', { phone: '((((((' }],
    ['phone', { phone: '12345' }],
    ['phone', { phone: '1'.repeat(21) }],
    ['message', { message: 'x'.repeat(1001) }],
  ])('rejects an invalid %s', (field, patch) => {
    expect(Object.keys(errorsFor(patch))).toEqual([field]);
  });

  it.each([
    { name: 'x'.repeat(100) },
    { phone: '+61 (2) 9000-0000' },
    { phone: '  0400 000 000  ' },
    { message: 'x'.repeat(1000) },
    { message: '   ' },
  ])('accepts boundary and optional values %j', (patch) => {
    expect(errorsFor(patch)).toEqual({});
  });
});

describe('toEnquiryInput', () => {
  it('trims values and leaves out blank optional fields', () => {
    expect(toEnquiryInput(3, { name: ' Ann ', email: ' ann@example.test ', phone: '  ', message: ' ' })).toEqual({
      productId: 3,
      name: 'Ann',
      email: 'ann@example.test',
    });
  });

  it('includes phone and message when given', () => {
    expect(toEnquiryInput(3, { ...valid, phone: ' 0400 000 000', message: 'Hi ' })).toMatchObject({
      phone: '0400 000 000',
      message: 'Hi',
    });
  });
});
