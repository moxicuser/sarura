import { useEffect, useState } from "react";

import { ApiError } from "./api";

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

/**
 * Fetch one API resource and keep its loading/error state.
 *
 * The caller passes the values that should trigger a new request as `deps`
 * (for example a product id or query string). Requests are aborted when the
 * component unmounts or the dependencies change.
 */
export function useApi<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    setLoading(true);

    loader(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reason instanceof ApiError
            ? reason
            : new ApiError(0, null, "The request could not be completed."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return {
    data,
    loading,
    error,
    reload: () => setVersion((current) => current + 1),
  };
}
