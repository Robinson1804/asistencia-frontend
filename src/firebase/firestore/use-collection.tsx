'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAt,
  startAfter,
  endAt,
  endBefore,
  doc,
  getDoc,
  type DocumentData,
  type CollectionReference,
  type Query,
} from 'firebase/firestore';

interface UseCollectionOptions {
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  filter?: {
    field: string;
    operator: '==' | '<' | '>' | '<=' | '>=' | '!=';
    value: any;
  };
  limit?: number;
  startAt?: any;
  startAfter?: any;
  endAt?: any;
  endBefore?: any;
}

export function useCollection<T extends DocumentData>(
  ref: CollectionReference<T> | Query<T> | null,
  options: UseCollectionOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc) => {
          result.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(result);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
