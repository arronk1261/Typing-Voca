"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface StarRatingProps {
  stars: number;
  label: string;
}

export function StarRating({ stars, label }: StarRatingProps) {
  return (
    <div
      className="flex flex-col items-center gap-2"
      role="img"
      aria-label={`별 ${stars}개, ${label}`}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => {
          const filled = i < stars;
          return (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 12,
                delay: 0.1 + i * 0.12,
              }}
            >
              <Star
                size={40}
                className={filled ? "text-star" : "text-line"}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={filled ? 0 : 1.5}
                aria-hidden
              />
            </motion.span>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="text-lg font-bold text-ink"
      >
        {label}
      </motion.p>
    </div>
  );
}
