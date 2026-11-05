import * as React from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuGroup = MenuPrimitive.Group;
const MenuSub = MenuPrimitive.Sub;
const MenuRadioGroup = MenuPrimitive.RadioGroup;

const surface =
  "z-50 min-w-[200px] overflow-hidden rounded-lg border bg-raised gloss p-1 text-foreground shadow-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

const itemBase =
  "relative flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 text-sm outline-hidden transition-colors duration-100 data-disabled:pointer-events-none data-highlighted:bg-muted data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

const MenuContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn(surface, className)} {...props} />
  </MenuPrimitive.Portal>
));
MenuContent.displayName = "MenuContent";

const MenuItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      itemBase,
      destructive && "text-danger data-highlighted:bg-danger-subtle [&_svg]:text-danger",
      className,
    )}
    {...props}
  />
));
MenuItem.displayName = "MenuItem";

const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenuPrimitive.RadioItem ref={ref} className={cn(itemBase, "pr-8", className)} {...props}>
    {children}
    <MenuPrimitive.ItemIndicator className="absolute right-2 flex">
      <Check className="text-foreground!" />
    </MenuPrimitive.ItemIndicator>
  </MenuPrimitive.RadioItem>
));
MenuRadioItem.displayName = "MenuRadioItem";

const MenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <MenuPrimitive.SubTrigger
    ref={ref}
    className={cn(itemBase, "data-[state=open]:bg-muted", className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </MenuPrimitive.SubTrigger>
));
MenuSubTrigger.displayName = "MenuSubTrigger";

const MenuSubContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.SubContent ref={ref} sideOffset={4} className={cn(surface, "min-w-[180px]", className)} {...props} />
  </MenuPrimitive.Portal>
));
MenuSubContent.displayName = "MenuSubContent";

function MenuSeparator({ className }: { className?: string }) {
  return <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}

function MenuLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <MenuPrimitive.Label className={cn("px-2 pb-1 pt-1.5 text-xs text-muted-foreground", className)}>
      {children}
    </MenuPrimitive.Label>
  );
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuSeparator,
  MenuLabel,
};
