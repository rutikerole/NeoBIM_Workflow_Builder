import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8AFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F] disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[#4F8AFF] text-white hover:bg-[#3D7AFF] active:bg-[#2B6AEF] shadow-sm",
        secondary:
          "bg-[#1A1A26] text-[#F0F0F5] border border-[#2A2A3E] hover:bg-[#242438] hover:border-[#3A3A4E] active:bg-[#1E1E2E]",
        ghost:
          "text-[#8888A0] hover:text-[#F0F0F5] hover:bg-[#1A1A26] active:bg-[#12121A]",
        danger:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C]",
        outline:
          "border border-[#2A2A3E] text-[#F0F0F5] hover:bg-[#1A1A26] hover:border-[#4F8AFF] active:bg-[#12121A]",
        success:
          "bg-[#10B981] text-white hover:bg-[#059669] active:bg-[#047857]",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-base",
        xl: "h-12 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
