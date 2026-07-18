import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  glowBorder?: boolean;
  shimmer?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  glowBorder = false,
  shimmer = false,
  id,
  style
}) => {
  const baseClasses = 'glass-panel rounded-2xl p-6 transition-all duration-300 relative';
  const hoverClasses = hoverEffect ? 'glass-card-hover cursor-pointer' : '';
  const glowClasses = glowBorder ? 'animate-border-dance shadow-purple-glow' : '';
  const combinedClasses = `${baseClasses} ${hoverClasses} ${glowClasses} ${className}`;

  if (shimmer) {
    return (
      <div id={id} className={`${baseClasses} ${className} overflow-hidden`} style={style}>
        <div className="shimmer-bg absolute inset-0 rounded-2xl pointer-events-none" />
        {children}
      </div>
    );
  }

  if (hoverEffect) {
    return (
      <motion.div
        id={id}
        onClick={onClick}
        className={combinedClasses}
        style={style}
        whileHover={{ scale: 1.015, translateY: -3 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div id={id} onClick={onClick} className={combinedClasses} style={style}>
      {children}
    </div>
  );
};
export default GlassCard;
