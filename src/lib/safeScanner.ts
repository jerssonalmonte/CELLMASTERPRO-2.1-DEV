import { Html5Qrcode } from 'html5-qrcode';

/**
 * Safely starts an Html5Qrcode scanner, waiting for the DOM element to be ready.
 * Returns a cleanup function.
 */
export function startSafeScanner(
  elementId: string,
  onScan: (code: string) => void,
  onError?: (err: unknown) => void
): { cleanup: () => void } {
  let cancelled = false;
  let scanner: Html5Qrcode | null = null;

  const tryStart = (retriesLeft: number) => {
    if (cancelled) return;

    const el = document.getElementById(elementId);
    if (!el) {
      if (retriesLeft > 0) {
        setTimeout(() => tryStart(retriesLeft - 1), 150);
      } else {
        onError?.(new Error(`Element #${elementId} not found after retries`));
      }
      return;
    }

    try {
      scanner = new Html5Qrcode(elementId);
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!cancelled) {
            onScan(decodedText);
            scanner?.stop().catch(() => {});
          }
        },
        () => {} // ignore scan errors
      ).catch((err) => {
        if (!cancelled) {
          console.error('Camera start error:', err);
          onError?.(err);
        }
      });
    } catch (err) {
      if (!cancelled) {
        console.error('Scanner init error:', err);
        // Retry if constructor fails (element might not be fully ready)
        if (retriesLeft > 0) {
          setTimeout(() => tryStart(retriesLeft - 1), 200);
        } else {
          onError?.(err);
        }
      }
    }
  };

  // Start with a small delay to let Dialog animation complete
  setTimeout(() => tryStart(5), 100);

  return {
    cleanup: () => {
      cancelled = true;
      scanner?.stop().catch(() => {});
      scanner = null;
    },
  };
}
