import type { ComponentPropsWithRef } from 'react';
import styles from './Button.module.css';

type NativeButtonProps = Omit<ComponentPropsWithRef<'button'>, 'className' | 'style'>;

interface ButtonProps extends NativeButtonProps {
  readonly variant?: 'primary' | 'secondary';
}

/** A real <button> (type="button" unless told otherwise). Styling stays in src/ui. */
export function Button({ variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${styles.button} ${styles[variant]}`} {...props} />;
}
