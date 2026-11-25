import type { Product } from '../types/index.ts';
import { EnquiryForm, EnquiryThanks } from '../ui/index.ts';
import { useEnquiryForm } from './useEnquiryForm.ts';

interface EnquiryPanelProps {
  readonly product: Product;
  readonly onCancel: () => void;
  /** After a successful send: start again with an empty form. */
  readonly onSendAnother: () => void;
}

/** Connects the enquiry form state to the UI: the form, then "Thank you" once sent. */
export function EnquiryPanel({ product, onCancel, onSendAnother }: EnquiryPanelProps) {
  const form = useEnquiryForm(product.id);

  if (form.status === 'sent') {
    return (
      <EnquiryThanks
        productTitle={product.title}
        category={product.category}
        email={form.values.email.trim()}
        onSendAnother={onSendAnother}
      />
    );
  }
  return (
    <EnquiryForm
      productTitle={product.title}
      values={form.values}
      errors={form.errors}
      sending={form.status === 'sending'}
      formError={form.formError}
      invalidAttempts={form.invalidAttempts}
      onChange={form.change}
      onSubmit={form.submit}
      onCancel={onCancel}
    />
  );
}
