import { motion } from 'framer-motion';

export function FloatingCard({ children, className = '', padding = 'p-3' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl ${padding} bg-white shadow-xl border border-white/20 ${className}`}
    >
      {children}
    </motion.div>
  );
}

