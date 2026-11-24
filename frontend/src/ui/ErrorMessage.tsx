import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  readonly title?: string;
  readonly message: string;
  /** Shows a "Try again" button when given. */
  readonly onRetry?: () => void;
}

export function ErrorMessage({ title = 'Something went wrong', message, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" className={styles.error}>
      <p className={styles.title}>{title}</p>
      <p>{message}</p>
      {onRetry !== undefined && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
