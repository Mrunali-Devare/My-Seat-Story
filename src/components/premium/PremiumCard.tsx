import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "spotlight";
  hover?: boolean;
}

export function PremiumCard({ children, className, variant = "default", hover = true }: PremiumCardProps) {
  const baseStyles = "relative rounded-xl border transition-[box-shadow,border-color,background-color] duration-300 focus-within:ring-2 focus-within:ring-[color:var(--color-gold)]/50";
  
  const variantStyles = {
    default: "bg-[color:var(--color-card)] border-[color:var(--color-border)] shadow-card hover:shadow-glow hover:border-[color:var(--color-gold)]/30",
    glass: "glass-strong border-white/10 shadow-glass hover:bg-white/10 hover:border-white/20",
    spotlight: "bg-[color:var(--color-card)] border-[color:var(--color-border)] shadow-card hover:shadow-glow"
  };

  return (
    <motion.div
      className={cn(baseStyles, variantStyles[variant], className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
    >
      {variant === "spotlight" && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
