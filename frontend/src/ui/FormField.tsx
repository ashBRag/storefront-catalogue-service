import type { Ref } from 'react';
import styles from './FormField.module.css';

interface FormFieldProps {
  /** Used for the input's id and name. */
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly type?: 'text' | 'email' | 'tel';
  readonly multiline?: boolean;
  readonly autoComplete?: string;
  readonly disabled?: boolean;
  /** Shows "N of max characters" under the field and links it as a description. */
  readonly characterLimit?: number;
  readonly ref?: Ref<HTMLInputElement & HTMLTextAreaElement>;
}

/**
 * A labelled input or textarea. The hint and error are linked with aria-describedby,
 * and aria-invalid is set when there is an error. Optional fields say so in the label.
 */
export function FormField({ id, label, value, onChange, error, hint, required = false, type = 'text', multiline = false, autoComplete, disabled, characterLimit, ref }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const countId = `${id}-count`;
  const describedBy =
    [hint !== undefined ? hintId : '', error !== undefined ? errorId : '', characterLimit !== undefined ? countId : '']
      .filter(Boolean)
      .join(' ') || undefined;
  const length = value.trim().length;
  const shared = {
    id,
    name: id,
    value,
    disabled,
    autoComplete,
    'aria-required': required || undefined,
    'aria-invalid': error !== undefined || undefined,
    'aria-describedby': describedBy,
    className: error === undefined ? styles.control : `${styles.control} ${styles.invalid}`,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {!required && <span className={styles.optional}> (optional)</span>}
      </label>
      {hint !== undefined && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...shared} ref={ref} rows={5} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...shared} ref={ref} type={type} onChange={(event) => onChange(event.target.value)} />
      )}
      {/* Below the input, so inputs in a row stay aligned whatever the errors say. */}
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      {characterLimit !== undefined && (
        // Deliberately not a live region: announcing every keystroke would be noise.
        // It is read with the field (aria-describedby) when the field gets focus.
        <p id={countId} className={length > characterLimit ? `${styles.count} ${styles.over}` : styles.count}>
          {length > characterLimit
            ? `${length} of ${characterLimit} characters: ${length - characterLimit} too many`
            : `${length} of ${characterLimit} characters`}
        </p>
      )}
    </div>
  );
}
