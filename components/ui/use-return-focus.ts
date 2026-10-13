"use client";
import { useRef } from "react";
/** Controlled dialogs often have no Radix Trigger; restore the actual opener. */
export function useReturnFocus(
  onOpen?: (event: Event) => void,
  onClose?: (event: Event) => void,
) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus(event: Event) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      onOpen?.(event);
    },
    onCloseAutoFocus(event: Event) {
      onClose?.(event);
      if (!event.defaultPrevented && opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus({ preventScroll: true });
      }
    },
  };
}
