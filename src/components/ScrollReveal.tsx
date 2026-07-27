import React from 'react';
import { motion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
}

export const ScrollReveal = ({ 
  children, 
  width = "fit-content", 
  className = "", 
  delay = 0,
  direction = "up",
  distance = 50,
  duration = 0.8
}: ScrollRevealProps) => {
  const getInitialProps = () => {
    switch (direction) {
      case "up": return { opacity: 0, y: distance };
      case "down": return { opacity: 0, y: -distance };
      case "left": return { opacity: 0, x: distance };
      case "right": return { opacity: 0, x: -distance };
      default: return { opacity: 0, y: distance };
    }
  };

  return (
    <div style={{ position: "relative", width, overflow: "visible" }} className={className}>
      <motion.div
        initial={getInitialProps()}
        whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ 
          duration, 
          delay, 
          ease: [0.33, 1, 0.68, 1] 
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
