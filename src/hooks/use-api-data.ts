'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

export function useApiData<T>(endpoint: string | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cache = useRef<Record<string, T[]>>({});

  useEffect(() => {
    if (!endpoint) {
      setIsLoading(false);
      return;
    }

    if (cache.current[endpoint]) {
      setData(cache.current[endpoint]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiFetch<T[]>(endpoint)
      .then(res => {
        cache.current[endpoint] = res;
        setData(res);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [endpoint]);

  return { data, isLoading };
}
