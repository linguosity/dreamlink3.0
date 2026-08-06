import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// v3 "Deep Current" button. Two changes from the shadcn default this was
// built on, both straight from the brand sheet's Components section:
//
//   • Pill radius, not rounded-md. Buttons are the one fully round shape in a
//     layout of 8/12/18px corners — it is what makes a button read as
//     pressable at a glance, and it echoes the mark's own pill bars.
//   • Taller: spec is a 46px minimum (54px large), this was 40px/44px. 46px
//     also clears the 44px tap-target floor with room rather than sitting
//     exactly on it.
//
// The sm/lg sizes carried their own `rounded-md`, which quietly reverted them
// to square-ish corners; those overrides are gone so every size is a pill.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-[15px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:scale-[0.98] focus-visible:brightness-110 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[46px] px-6 py-3",
        sm: "min-h-[38px] px-4 text-sm",
        lg: "min-h-[54px] px-[30px] text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
}

export { Button, buttonVariants };
