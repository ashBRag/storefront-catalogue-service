import { useEffect, useRef, useState } from 'react';
import { submitEnquiry } from '../api/catalogue.ts';
import { ApiError, isAbortError } from '../api/client.ts';
import {
  EMPTY_ENQUIRY,
  FIELD_LABELS,
  isEnquiryField,
  toEnquiryInput,
  validateEnquiry,
  type EnquiryErrors,
  type EnquiryField,
  type EnquiryValues,
} from './validation.ts';

export type EnquiryStatus = 'editing' | 'sending' | 'sent';

export interface EnquiryForm {
  readonly values: EnquiryValues;
  readonly errors: EnquiryErrors;
  readonly status: EnquiryStatus;
  /** Form-level problem (not tied to a field); values are kept so the customer can retry. */
  readonly formError: string | undefined;
  /** Increases on every submit attempt that ends with field errors; the UI focuses the first one. */
  readonly invalidAttempts: number;
  readonly change: (field: EnquiryField, value: string) => void;
  readonly submit: () => void;
}

/**
 * State and submission for one product's enquiry form. Nothing is stored in
 * the browser: values live only in React state while the form is open.
 */
export function useEnquiryForm(productId: number): EnquiryForm {
  const [values, setValues] = useState<EnquiryValues>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [status, setStatus] = useState<EnquiryStatus>('editing');
  const [formError, setFormError] = useState<string>();
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const controller = useRef<AbortController>(null);

  // Abort a send still in flight if the form goes away (e.g. the customer navigates).
  useEffect(() => () => controller.current?.abort(), []);

  function change(field: EnquiryField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // After a failed attempt, re-check as they type so fixed fields clear at once.
    if (invalidAttempts > 0) setErrors(validateEnquiry(next));
  }

  function showFieldErrors(fieldErrors: EnquiryErrors) {
    setErrors(fieldErrors);
    setInvalidAttempts((count) => count + 1);
  }

  async function submit() {
    if (status === 'sending') return; // double-submit guard (the button is disabled too)
    const clientErrors = validateEnquiry(values);
    if (Object.keys(clientErrors).length > 0) {
      showFieldErrors(clientErrors);
      return;
    }

    setErrors({});
    setFormError(undefined);
    setStatus('sending');
    controller.current = new AbortController();
    try {
      await submitEnquiry(toEnquiryInput(productId, values), controller.current.signal);
      setStatus('sent');
    } catch (error) {
      if (isAbortError(error)) return;
      setStatus('editing');
      const fieldErrors = serverFieldErrors(error);
      if (fieldErrors !== undefined) showFieldErrors(fieldErrors);
      else setFormError(failureMessage(error));
    }
  }

  return { values, errors, status, formError, invalidAttempts, change, submit: () => void submit() };
}

/** Maps a 400's `details` onto our fields, e.g. { path: 'email', message: 'must be…' }. */
function serverFieldErrors(error: unknown): EnquiryErrors | undefined {
  if (!(error instanceof ApiError) || error.status !== 400) return undefined;
  const errors: EnquiryErrors = {};
  for (const { path, message } of error.fieldErrors) {
    if (isEnquiryField(path)) errors[path] = `${FIELD_LABELS[path]} ${message}`;
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Sorry, this product is no longer available, so we couldn’t send your enquiry.';
    if (error.status === 429) return 'You’ve sent several enquiries in a short time. Please wait a minute and try again.';
    if (error.status === 400) return 'Please check your details and try again.';
  }
  return 'We couldn’t send your enquiry. Please try again in a moment. Your details are still here.';
}
