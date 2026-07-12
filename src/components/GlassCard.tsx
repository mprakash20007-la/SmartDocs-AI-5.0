import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  id
}) => {
  const baseClasses = 'glass-panel rounded-2xl p-6 transition-all duration-300';
  const hoverClasses = hoverEffect ? 'glass-card-hover cursor-pointer' : '';
  const combinedClasses = `${baseClasses} ${hoverClasses} ${className}`;

  if (hoverEffect) {
    return (
      <motion.div
        id={id}
        onClick={onClick}
        className={combinedClasses}
        whileHover={{ scale: 1.01, translateY: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div id={id} onClick={onClick} className={combinedClasses}>
      {children}
    </div>
  );
};
export default GlassCard;
