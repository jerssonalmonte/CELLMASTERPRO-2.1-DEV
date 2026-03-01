import { useState, useCallback } from 'react';

function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const setValue = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = val instanceof Function ? val(prev) : val;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [state, setValue];
}

export default useLocalStorage;
