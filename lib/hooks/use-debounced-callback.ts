"use client";

import { useEffect, useRef } from "react";

/**
 * Fires fn(latestValue) `ms` after the LAST change to `value`.
 * Also fires once `ms` after mount — guard with a `dirty` flag in the caller
 * when you only want to persist AFTER the user actually edited.
 */
export function useDebouncedCallback<T>(
  value: T,
  ms: number,
  fn: (latest: T) => void,
) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => {
    const timer = setTimeout(() => fnRef.current(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
}
