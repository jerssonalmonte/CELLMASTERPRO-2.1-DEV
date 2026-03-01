import useLocalStorage from './useLocalStorage';

const DEFAULT_THRESHOLD = 5;

export function useLowStockThreshold() {
  const [threshold, setThreshold] = useLocalStorage<number>('low_stock_threshold', DEFAULT_THRESHOLD);
  return { threshold, setThreshold };
}
