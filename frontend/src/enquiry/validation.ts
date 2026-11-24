import type { EnquiryInput } from '../types/index.ts';

// Client-side copy of the backend rules in docs/PLAN.md (Assumptions → Enquiry
// "contact details"). The backend stays the authority: anything it still rejects
// comes back as field errors and is shown the same way.

export const ENQUIRY_FIELDS = ['name', 'email', 'phone', 'message'] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

export type EnquiryValues = Record<EnquiryField, string>;
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export const EMPTY_ENQUIRY: EnquiryValues = { name: '', email: '', phone: '', message: '' };

export const LIMITS = { name: 100, email: 254, phoneMin: 6, phoneMax: 20, message: 1000 } as const;

const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;
/** Deliberately simple; the backend's stricter check still applies. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FIELD_LABELS: Record<EnquiryField, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  message: 'Message',
};

/** Returns an error message per invalid field; an empty object means valid. */
export function validateEnquiry(values: EnquiryValues): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (name === '') errors.name = 'Enter your name';
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer`;

  if (email === '') errors.email = 'Enter your email address';
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address, like name@example.com';
  }

  if (phone !== '' && !isValidPhone(phone)) {
    errors.phone = `Enter a phone number of ${LIMITS.phoneMin}–${LIMITS.phoneMax} characters, using digits, spaces, +, - or ()`;
  }

  if (message.length > LIMITS.message) errors.message = `Message must be ${LIMITS.message} characters or fewer`;

  return errors;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '').length;
  return (
    phone.length >= LIMITS.phoneMin &&
    phone.length <= LIMITS.phoneMax &&
    PHONE_PATTERN.test(phone) &&
    digits >= LIMITS.phoneMin
  );
}

/** Trimmed request body; blank optional fields are left out. */
export function toEnquiryInput(productId: number, values: EnquiryValues): EnquiryInput {
  const phone = values.phone.trim();
  const message = values.message.trim();
  return {
    productId,
    name: values.name.trim(),
    email: values.email.trim(),
    ...(phone === '' ? {} : { phone }),
    ...(message === '' ? {} : { message }),
  };
}

export function isEnquiryField(value: string): value is EnquiryField {
  return (ENQUIRY_FIELDS as readonly string[]).includes(value);
}
