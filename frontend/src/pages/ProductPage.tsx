import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getProduct } from '../api/catalogue.ts';
import { ApiError } from '../api/client.ts';
import { userMessage } from '../api/errors.ts';
import { EnquiryPanel } from '../enquiry/EnquiryPanel.tsx';
import { useAsync } from '../hooks/useAsync.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { homePath } from '../paths.ts';
import type { Product } from '../types/index.ts';
import { Button, EmptyState, ErrorMessage, PageTitle, ProductDetails, Spinner } from '../ui/index.ts';

/** Same rule as the backend: a positive integer (up to 9 digits). */
const PRODUCT_ID = /^[1-9]\d{0,8}$/;
const ENQUIRY_PANEL_ID = 'enquiry-panel';

/** /products/:id: details plus the enquiry flow. An invalid id never calls the API. */
export function ProductPage() {
  const { id = '' } = useParams();
  if (!PRODUCT_ID.test(id)) return <ProductNotFound />;
  // Keyed so a different product starts fresh (closed enquiry, new data).
  return <ProductView key={id} id={Number(id)} />;
}

function ProductView({ id }: { readonly id: number }) {
  const product = useAsync((signal) => getProduct(id, signal), [id]);
  const notFound = product.status === 'error' && product.error instanceof ApiError && [400, 404].includes(product.error.status);
  useDocumentTitle(product.status === 'success' ? product.data.title : notFound ? 'Product not found' : 'Product');

  if (notFound) return <ProductNotFound />;
  if (product.status === 'loading') return <Spinner label="Loading product" />;
  if (product.status === 'error') {
    return (
      <>
        <PageTitle>Product</PageTitle>
        <ErrorMessage title="Couldn't load this product" message={userMessage(product.error)} onRetry={product.reload} />
      </>
    );
  }
  return (
    <ProductDetails product={product.data}>
      <Enquiry product={product.data} />
    </ProductDetails>
  );
}

/** The Enquire button and the inline panel it opens. Cancel closes it and returns focus to the button. */
function Enquiry({ product }: { readonly product: Product }) {
  const [open, setOpen] = useState(false);
  // Changing the key remounts the panel: a fresh, empty form (focus goes to Name).
  const [formKey, setFormKey] = useState(0);
  const enquireButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // The button only exists again after the panel closes and React re-renders,
  // so focus it in an effect rather than in the click handler.
  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      enquireButton.current?.focus();
    }
  }, [open]);

  function close() {
    returnFocus.current = true;
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <div>
          <Button ref={enquireButton} aria-expanded={false} aria-controls={ENQUIRY_PANEL_ID} onClick={() => setOpen(true)}>
            Enquire
          </Button>
        </div>
      )}
      <div id={ENQUIRY_PANEL_ID}>
        {open && (
          <EnquiryPanel
            key={formKey}
            product={product}
            onCancel={close}
            onSendAnother={() => setFormKey((key) => key + 1)}
          />
        )}
      </div>
    </>
  );
}

function ProductNotFound() {
  useDocumentTitle('Product not found');
  return (
    <>
      <PageTitle>Product not found</PageTitle>
      <EmptyState title="We couldn't find that product." message="It may no longer be available, or the link may be wrong.">
        <p>
          <Link to={homePath()}>Go to the home page</Link>
        </p>
      </EmptyState>
    </>
  );
}
