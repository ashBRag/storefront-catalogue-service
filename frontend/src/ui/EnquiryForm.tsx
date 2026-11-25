import { useEffect, useRef, type FormEvent } from 'react';
import type { EnquiryErrors, EnquiryField, EnquiryValues } from '../enquiry/validation.ts';
import { Button } from './Button.tsx';
import { FormField } from './FormField.tsx';
import styles from './EnquiryForm.module.css';

interface EnquiryFormProps {
  readonly productTitle: string;
  readonly values: EnquiryValues;
  readonly errors: EnquiryErrors;
  readonly sending: boolean;
  readonly formError: string | undefined;
  /** Changes on each submit that ends with field errors; focus moves to the first one. */
  readonly invalidAttempts: number;
  readonly onChange: (field: EnquiryField, value: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const FIELD_ORDER: readonly EnquiryField[] = ['name', 'email', 'phone', 'message'];
const MESSAGE_MAX_LENGTH = 1000;

/** The enquiry form. Presentation and focus only; state and submission live in src/enquiry. */
export function EnquiryForm({ productTitle, values, errors, sending, formError, invalidAttempts, onChange, onSubmit, onCancel }: EnquiryFormProps) {
  const fields = useRef<Partial<Record<EnquiryField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  // Opening the form moves focus to the first field.
  useEffect(() => {
    fields.current.name?.focus();
  }, []);

  // After a failed submit, move focus to the first field with an error.
  useEffect(() => {
    if (invalidAttempts === 0) return;
    const first = FIELD_ORDER.find((field) => errors[field] !== undefined);
    if (first !== undefined) fields.current[first]?.focus();
    // Deliberately depends only on invalidAttempts: focus moves once per failed
    // submit, not on every keystroke that changes `errors`.
  }, [invalidAttempts]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const field = (name: EnquiryField) => ({
    id: `enquiry-${name}`,
    value: values[name],
    error: errors[name],
    disabled: sending,
    onChange: (value: string) => onChange(name, value),
    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      fields.current[name] = element;
    },
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-labelledby="enquiry-heading">
      <h2 id="enquiry-heading" className={styles.heading}>
        Enquire about {productTitle}
      </h2>
      <p className={styles.intro}>Our sales team will reply to you by email.</p>
      <div className={styles.row}>
        <FormField {...field('name')} label="Name" required autoComplete="name" />
        <FormField {...field('email')} label="Email" type="email" required autoComplete="email" />
      </div>
      <div className={styles.row}>
        <FormField {...field('phone')} label="Phone" type="tel" autoComplete="tel" hint="Digits, spaces, +, - or ()." />
      </div>
      <FormField {...field('message')} label="Message" multiline characterLimit={MESSAGE_MAX_LENGTH} hint="Questions about size, stock, delivery or anything else." />

      {formError !== undefined && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}
      <p role="status" className={styles.status}>
        {sending ? 'Sending your enquiry…' : ''}
      </p>

      <div className={styles.actions}>
        <Button type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send enquiry'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
