import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, type, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#F0F0F5]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55556A]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "w-full h-9 rounded-lg border bg-[#12121A] px-3 py-2 text-sm text-[#F0F0F5] placeholder:text-[#55556A]",
              "border-[#2A2A3E] focus:border-[#4F8AFF] focus:outline-none focus:ring-1 focus:ring-[#4F8AFF]",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#55556A]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-[#EF4444]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[#55556A]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[#F0F0F5]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full rounded-lg border bg-[#12121A] px-3 py-2 text-sm text-[#F0F0F5] placeholder:text-[#55556A]",
            "border-[#2A2A3E] focus:border-[#4F8AFF] focus:outline-none focus:ring-1 focus:ring-[#4F8AFF]",
            "transition-colors duration-150 resize-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[#EF4444]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[#55556A]">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
