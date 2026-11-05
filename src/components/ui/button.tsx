import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Light: a glossy blue pill. Dark: a white pill, as on the portal.
        // Colours come from the --cta tokens so the in-app theme toggle applies.
        primary:
          "rounded-full bg-[hsl(var(--cta))] bg-[linear-gradient(to_bottom,hsl(0_0%_100%/var(--cta-sheen)),hsl(0_0%_100%/0))] text-[hsl(var(--cta-fg))] shadow-[var(--shadow-cta)] hover:bg-[hsl(var(--cta-hover))]",
        secondary:
          "rounded-full border border-border-strong bg-background text-foreground shadow-xs hover:border-muted-foreground/30 hover:bg-subtle",
        ghost: "text-foreground hover:bg-muted",
        quiet: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger:
          "rounded-full bg-danger-solid text-white shadow-xs hover:bg-danger-solid/90",
        "danger-outline":
          "rounded-full border border-border-strong bg-background text-danger shadow-xs hover:border-danger/40 hover:bg-danger-subtle",
        link: "h-auto px-0 text-primary-text underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      type = "button",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
