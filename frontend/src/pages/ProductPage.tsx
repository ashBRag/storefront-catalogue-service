import { useParams } from 'react-router';

/** Placeholder: product details and the enquiry form come in a later step. */
export function ProductPage() {
  const { id = '' } = useParams();
  return <h1>Product {id}</h1>;
}
