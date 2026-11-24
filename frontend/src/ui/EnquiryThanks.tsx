import { useEffect, useRef } from 'react';
import styles from './EnquiryThanks.module.css';

interface EnquiryThanksProps {
  readonly productTitle: string;
  readonly email: string;
}

/** Replaces the form after a successful send. Takes focus so screen readers announce it. */
export function EnquiryThanks({ productTitle, email }: EnquiryThanksProps) {
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
        We’ve sent your enquiry about <strong>{productTitle}</strong> to our sales team. They’ll reply to {email}.
      </p>
    </div>
  );
}
