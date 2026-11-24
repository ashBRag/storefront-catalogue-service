import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsync } from './useAsync.ts';

/** A promise you resolve or reject by hand, to control response order. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsync', () => {
  it('goes from loading to success', async () => {
    const { result } = renderHook(() => useAsync(async () => 'data', []));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'data' }));
  });

  it('reports errors', async () => {
    const { result } = renderHook(() => useAsync(async () => Promise.reject(new Error('boom')), []));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toMatchObject({ error: new Error('boom') });
  });

  it('ignores a slow earlier response when params change (no race)', async () => {
    const requests: Record<string, ReturnType<typeof deferred<string>>> = { a: deferred(), b: deferred() };
    const signals: Record<string, AbortSignal> = {};
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useAsync((signal) => {
          signals[query] = signal;
          return requests[query]!.promise;
        }, [query]),
      { initialProps: { query: 'a' } },
    );

    rerender({ query: 'b' });
    expect(signals.a?.aborted).toBe(true);

    await act(async () => {
      requests.b!.resolve('result b');
    });
    await act(async () => {
      requests.a!.resolve('stale result a');
    });

    expect(result.current).toMatchObject({ status: 'success', data: 'result b' });
  });

  it('aborts the in-flight request on unmount', () => {
    let captured: AbortSignal | undefined;
    const { unmount } = renderHook(() =>
      useAsync((signal) => {
        captured = signal;
        return new Promise<never>(() => {});
      }, []),
    );

    unmount();
    expect(captured?.aborted).toBe(true);
  });

  it('reload runs the loader again', async () => {
    const load = vi.fn(async () => 'data');
    const { result } = renderHook(() => useAsync(load, []));
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.reload());

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
