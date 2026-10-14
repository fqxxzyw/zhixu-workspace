"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={"modal " + (wide ? "wide" : "")}>
        <div className="modal-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description || " "}</DialogDescription>
        </div>
        <div className="modal-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
export function Choice({
  value,
  onChange,
  items,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  items: (string | { value: string; label: string })[];
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={label || "选择"}
        title={
          items
            .map((v) => (typeof v === "string" ? { value: v, label: v } : v))
            .find((v) => v.value === value)?.label
        }
        className="choice"
      >
        <SelectValue placeholder={label || "选择"} />
      </SelectTrigger>
      <SelectContent>
        {items.map((v) =>
          typeof v === "string" ? (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ) : (
            <SelectItem key={v.value} value={v.value}>
              {v.label}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
export function Btn({
  children,
  primary = false,
  className = "",
  ...p
}: React.ComponentProps<typeof Button> & { primary?: boolean }) {
  return (
    <Button
      {...p}
      variant={primary ? "default" : "outline"}
      className={"btn " + (primary ? "primary " : "") + className}
    >
      {children}
    </Button>
  );
}
export async function api(
  action: string,
  data: any = {},
  method = "POST",
): Promise<any> {
  const url =
    method === "GET"
      ? "/api/workspace?" + new URLSearchParams({ action, ...data })
      : "/api/workspace";
  const r = await fetch(url, {
    method,
    ...(method === "POST"
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...data }),
        }
      : {}),
  });
  const v: any = await r.json();
  if (!r.ok) throw new Error(v.error || "操作失败");
  return v;
}

/** Shared Settings-style row: content may wrap, the control retains its size. */
export function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      {icon && <span className="setting-icon">{icon}</span>}
      <div className="setting-copy">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
export function LoadingState({ label = "正在加载…" }: { label?: string }) {
  return (
    <main
      className="loading-surface"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p>{label}</p>
      <div className="skeleton-layout" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
    </main>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "aria-label"> & {
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          variant="ghost"
          aria-label={label}
          className={"icon-button " + className}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
