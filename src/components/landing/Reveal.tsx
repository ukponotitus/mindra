import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  /** Milliseconds to wait after the element enters the screen, for staggered entrances. */
  delay?: number;
  className?: string;
}

/** Fades its content up into place the first time it scrolls into view. */
export default function Reveal({ children, delay = 0, className = "" }: Props) {
  // With reduced motion, content is simply there; nothing waits for a scroll to appear.
  if (useReducedMotion()) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: delay / 1000, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
