"use client";
import { forwardRef, useLayoutEffect, useRef } from "react";
/** Fit the actual rendered lines, including soft wrapping; no manual resize. */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoTextarea({ value, className = "", style, ...props }, forwarded) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height =
      Math.max(
        26,
        el.scrollHeight +
          parseFloat(getComputedStyle(el).borderTopWidth || "0") +
          parseFloat(getComputedStyle(el).borderBottomWidth || "0"),
      ) + "px";
  };
  useLayoutEffect(() => {
    fit();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        fit();
      }
    });
    let width = el.clientWidth;
    observer.observe(el);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [value]);
  return (
    <textarea
      {...props}
      rows={1}
      value={value}
      className={"auto-textarea " + className}
      style={{ ...style, resize: "none", overflow: "hidden" }}
      ref={(el) => {
        ref.current = el;
        if (typeof forwarded === "function") forwarded(el);
        else if (forwarded) forwarded.current = el;
      }}
    />
  );
});
