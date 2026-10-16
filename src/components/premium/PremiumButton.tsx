import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "crimson" | "gold" | "glass" | "outline";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export function PremiumButton({
  variant = "crimson",
  size = "md",
  children,
  className,
  asChild = false,
  ...props
}: PremiumButtonProps) {
  const baseStyles = "relative overflow-hidden transition-all duration-300 font-medium tracking-wide flex items-center justify-center gap-2";
  
  const variantStyles = {
    crimson: "bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-primary-glow)] text-[color:var(--color-primary-foreground)] border border-[color:var(--color-primary)]/50 shadow-glow hover:scale-105 hover:shadow-lg",
    gold: "bg-gradient-to-r from-[color:var(--color-gold)] to-[color:var(--color-gold)] text-[color:var(--color-gold-foreground)] border border-[color:var(--color-gold)]/50 shadow-glow hover:scale-105 hover:shadow-lg",
    glass: "bg-glass text-[color:var(--color-foreground)] border border-white/10 shadow-glass hover:bg-white/10 hover:scale-105",
    outline: "bg-transparent border-2 border-[color:var(--color-gold)] text-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/10"
  };
  
  const sizeStyles = {
    sm: "px-5 py-2.5 h-10 text-sm min-w-[100px]",
    md: "px-6 py-3 h-12 text-base min-w-[120px]",
    lg: "px-8 py-4 h-14 text-lg min-w-[140px]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        asChild={asChild}
        {...props}
      >
        {asChild ? (
          <>
            {children}
            {(variant === "crimson" || variant === "gold") && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </>
        ) : (
          <>
            <span className="relative z-10 flex items-center gap-2">{children}</span>
            {(variant === "crimson" || variant === "gold") && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </>
        )}
      </Button>
    </motion.div>
  );
}
