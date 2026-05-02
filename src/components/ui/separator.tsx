import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { twMerge } from "tailwind-merge";

const Separator = React.forwardRef<
  HTMLHRElement,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={true}
    className={twMerge(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
