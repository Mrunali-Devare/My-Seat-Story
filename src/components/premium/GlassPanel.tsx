import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg";
}

export function GlassPanel({ children, className, blur = "md" }: GlassPanelProps) {
  const blurStyles = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md", 
    lg: "backdrop-blur-lg"
  };

  return (
    <motion.div
      className={cn(
        "glass-strong rounded-2xl shadow-glass glass-hover",
        blurStyles[blur],
        className
      )}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onFocus={(e) => e.currentTarget.classList.add("ring-2", "ring-white/20")}
      onBlur={(e) => e.currentTarget.classList.remove("ring-2", "ring-white/20")}
    >
      {children}
    </motion.div>
  );
}
