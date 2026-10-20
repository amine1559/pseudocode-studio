"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 shadow-none outline-none placeholder:text-zinc-500 focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
