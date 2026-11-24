import type { Product } from '../types/index.ts';
import { EnquiryForm, EnquiryThanks } from '../ui/index.ts';
import { useEnquiryForm } from './useEnquiryForm.ts';

interface EnquiryPanelProps {
  readonly product: Product;
  readonly onCancel: () => void;
}

/** Connects the enquiry form state to the UI: the form, then "Thank you" once sent. */
export function EnquiryPanel({ product, onCancel }: EnquiryPanelProps) {
  const form = useEnquiryForm(product.id);

  if (form.status === 'sent') {
    return <EnquiryThanks productTitle={product.title} email={form.values.email.trim()} />;
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
