import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: Error }
  | { readonly status: 'success'; readonly data: T };

/**
 * Runs `load` on mount and whenever `deps` change, and tracks loading, error and data.
 * Each run gets its own AbortController. When deps change or the component unmounts,
 * the previous run is aborted and its result ignored, so a slow earlier response
 * can never overwrite a newer one.
 *
 * `deps` must list every value `load` uses (as with useEffect).
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): AsyncState<T> & { readonly reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error: toError(error) });
      },
    );
    return () => controller.abort();
    // `load` is a fresh closure each render, so it is deliberately not a dependency:
    // the caller's deps decide when to re-run.
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, reload };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
