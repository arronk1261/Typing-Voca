import type { Variants } from "framer-motion";

export const slideVariants: Variants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

export const fadeVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
};

export const transitionFast = { duration: 0.24, ease: "easeOut" } as const;
