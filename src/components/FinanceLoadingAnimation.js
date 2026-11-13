"use client";

import React from "react";
import { motion } from "framer-motion";

export default function FinanceLoadingAnimation() {
  const dots = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFFFF] overflow-hidden select-none">
      <div className="flex items-center justify-center gap-3.5">
        {dots.map((index) => (
          <motion.div
            key={index}
            className="w-3.5 h-3.5 rounded-full bg-[#B063FF]"
            animate={{
              scale: [0.85, 1.45, 0.85],
              opacity: [0.3, 1, 0.3],
              boxShadow: [
                "0 0 0px rgba(176, 99, 255, 0)",
                "0 0 12px rgba(176, 99, 255, 0.7)",
                "0 0 0px rgba(176, 99, 255, 0)",
              ],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.22,
            }}
          />
        ))}
      </div>
    </div>
  );
}
