import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { categoryPath } from '../paths.ts';
import { Button } from './Button.tsx';
import { formatCategory } from './format.ts';
import styles from './EnquiryThanks.module.css';

interface EnquiryThanksProps {
  readonly productTitle: string;
  readonly category: string;
  readonly email: string;
  /** Opens a fresh, empty form for another enquiry about the same product. */
  readonly onSendAnother: () => void;
}

/**
 * Replaces the form after a successful send. The heading takes focus so screen
 * readers announce the outcome, then offers the obvious next steps.
 */
export function EnquiryThanks({ productTitle, category, email, onSendAnother }: EnquiryThanksProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className={styles.thanks}>
      <h2 ref={heading} tabIndex={-1} className={styles.heading}>
        Thank you
      </h2>
      <p>
        We’ve sent your enquiry about <strong>{productTitle}</strong> to our sales team. They’ll reply to{' '}
        <strong>{email}</strong>.
      </p>
      <div className={styles.actions}>
        <Link to={categoryPath(category)}>Continue browsing {formatCategory(category)}</Link>
        <Button variant="secondary" onClick={onSendAnother}>
          Send another enquiry
        </Button>
      </div>
    </div>
  );
}
