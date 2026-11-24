import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState.tsx';
import { ErrorMessage } from './ErrorMessage.tsx';
import { Spinner } from './Spinner.tsx';

describe('Spinner', () => {
  it('is a status region with a readable label', () => {
    render(<Spinner label="Loading products" />);
    expect(screen.getByRole('status').textContent).toBe('Loading products…');
  });
});

describe('ErrorMessage', () => {
  it('is an alert and only shows retry when given a handler', () => {
    const { rerender } = render(<ErrorMessage message="Upstream down" />);
    expect(screen.getByRole('alert').textContent).toContain('Upstream down');
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<ErrorMessage message="Upstream down" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('calls onRetry', async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="x" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('EmptyState', () => {
  it('shows the title, message and any follow-up', () => {
    render(
      <EmptyState title="No results" message="Try another search.">
        <a href="/">Home</a>
      </EmptyState>,
    );
    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.getByText('Try another search.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy();
  });
});
