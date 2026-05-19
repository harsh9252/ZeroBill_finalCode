import React from "react";
import { motion } from "framer-motion";

/**
 * ActionBlock
 * - Exported as default so you can import easily
 */
export default function ActionBlock({ label, icon, color = "yellow", onClick, className = "" }) {
  const tileBg =
    color === "yellow"
      ? "from-yellow-400 to-yellow-500 border-yellow-300/40"
      : color === "blue"
        ? "from-[#1b75be] to-[#1b75be] border-[#1b75be]/40"
        : color === "green"
          ? "from-[#2B9348] to-[#2B9348] border-[#2B9348]/40"
          : "from-gray-200 to-gray-100 border-gray-200/40";

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 180, damping: 12 }}
      className={`relative inline-flex flex-col items-center w-full ${className}`}
    >
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        tabIndex={0}
        className="relative flex flex-col items-center gap-2 p-2 rounded-xl w-full focus:outline-none"
        type="button"
      >
        {/* ICON TILE */}
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center shadow bg-gradient-to-br ${tileBg} border transform transition`}
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon, {
              className: icon.props.className || "h-6 w-6 text-white",
              style: { pointerEvents: "none", ...(icon.props.style || {}) },
            })
            : icon}
        </div>

        {/* LABEL — allows wrapping for long translations */}
        <div
          className="text-[10px] sm:text-xs font-medium text-gray-800 text-center mt-1 leading-tight break-words px-1"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: '3',
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.5em'
          }}
        >
          {label}
        </div>
      </motion.button>
    </motion.div>
  );
}
