// src/components/Icon.jsx
import React from 'react';
import { ICON_PATHS, ICON_META } from '../utils/icons';

export function Icon({ name, size = 24, color, animated = true, className = '' }) {
  const path = ICON_PATHS[name];
  if (!path) return null;

  const meta = ICON_META[name] || {};
  const finalColor = color || meta.color || 'currentColor';
  
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    stroke: finalColor,
  };

  const svgClasses = `icon-svg ${animated ? 'icon-draw' : ''} ${className}`;

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={style}
      className={svgClasses}
    >
      <path d={path} />
    </svg>
  );
}
