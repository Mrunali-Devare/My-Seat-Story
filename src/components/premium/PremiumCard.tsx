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
  const baseStyles = "relative rounded-xl border transition-all duration-500";
  
  const variantStyles = {
    default: "bg-[color:var(--color-card)] border-[color:var(--color-border)] shadow-card hover:shadow-glow hover:border-[color:var(--color-gold)]/30",
    glass: "glass-strong border-white/10 shadow-glass hover:bg-white/10 hover:border-white/20",
    spotlight: "bg-[color:var(--color-card)] border-[color:var(--color-border)] shadow-card hover:shadow-glow"
  };

  const hoverStyles = hover ? "hover:scale-[1.02] hover:-translate-y-1" : "";

  return (
    <motion.div
      className={cn(baseStyles, variantStyles[variant], hoverStyles, className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      onFocus={hover ? (e) => e.currentTarget.classList.add("ring-2", "ring-[color:var(--color-gold)]/50") : undefined}
      onBlur={hover ? (e) => e.currentTarget.classList.remove("ring-2", "ring-[color:var(--color-gold)]/50") : undefined}
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
