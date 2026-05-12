// src/components/Icon.jsx
import React from 'react';
import { ICON_PATHS, ICON_META } from '../utils/icons';

export function Icon({ name, size = 24, color, animated = false, className = '', showLabel = false }) {
  const path = ICON_PATHS[name];
  if (!path) return null;

  const meta = ICON_META[name] || {};
  const finalColor = color || meta.color || 'currentColor';
  
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    stroke: finalColor,
    flexShrink: 0,
  };

  const svgClasses = `icon-svg ${animated ? 'icon-draw' : ''} ${className}`;

  return (
    <span className="icon-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
      {showLabel && meta.label && (
        <span style={{ fontSize: 10, color: finalColor, textAlign: 'center', lineHeight: 1.2 }}>
          {meta.label}
        </span>
      )}
    </span>
  );
}
