import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  fallback?: React.ReactNode;
}

export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-700 " +
        (className ?? "")
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarFallback({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={"text-sm font-semibold " + (className ?? "")} {...props}>
      {children}
    </span>
  );
}

