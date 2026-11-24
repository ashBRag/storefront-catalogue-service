import { Link } from 'react-router';
import { homePath } from '../paths.ts';
import { EmptyState } from '../ui/index.ts';

export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <EmptyState title="We couldn't find that page." message="It may have moved, or the link may be wrong.">
        <p>
          <Link to={homePath()}>Go to the home page</Link>
        </p>
      </EmptyState>
    </>
  );
}
