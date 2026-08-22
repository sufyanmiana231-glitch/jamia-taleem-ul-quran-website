"use client";

import { useEffect, useState } from "react";

type Subscribable<T> = {
  subscribeAll(onData: (items: T[]) => void, onError?: (err: Error) => void): () => void;
};

/**
 * Wraps a repository's subscribeAll() in loading/error/data state so pages
 * don't each re-implement the same useEffect + useState dance. Live
 * (onSnapshot-backed) by design — lists stay in sync across the app
 * without manual refetching.
 */
export function useRepositoryList<T>(repository: Subscribable<T>): {
  data: T[];
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = repository.subscribeAll(
      (items) => {
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [repository]);

  return { data, loading, error };
}
