import { useParams } from 'react-router';

/** Placeholder: top rated and other products come in the next step. */
export function CategoryPage() {
  // React Router has already decoded the param: "men's%20clothing" → "men's clothing".
  const { category = '' } = useParams();
  return <h1>{category}</h1>;
}
