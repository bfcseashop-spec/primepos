import { useEffect, useRef, useCallback } from "react";

/**
 * Barcode scanners typically type characters very quickly (< 50ms between chars)
 * and send Enter at the end. We distinguish from normal typing by:
 * - Accumulating chars; reset if > 120ms since last key
 * - On Enter: if buffer has 3+ chars, treat as barcode scan
 * - Skip when user is actively typing in an input (slow, or < 3 chars before Enter)
 */
const BARCODE_MIN_LENGTH = 3;
const BARCODE_MAX_PAUSE_MS = 120;

export function useGlobalBarcodeScanner(onScan: (value: string) => void) {
  const handlerRef = useRef(onScan);
  handlerRef.current = onScan;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const active = document.activeElement;
    const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.getAttribute("contenteditable") === "true");
    if (isInput) return;

    const now = Date.now();
    const elapsed = now - lastKeyTimeRef.current;

    if (elapsed > BARCODE_MAX_PAUSE_MS) {
      bufferRef.current = "";
    }
    lastKeyTimeRef.current = now;

    if (e.key === "Enter") {
      const value = bufferRef.current.trim();
      bufferRef.current = "";
      if (value.length >= BARCODE_MIN_LENGTH) {
        e.preventDefault();
        e.stopPropagation();
        handlerRef.current(value);
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      bufferRef.current += e.key;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
}
