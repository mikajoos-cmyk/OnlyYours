import React from 'react';

interface WatermarkLayerProps {
  username?: string;
  enabled?: boolean;
  opacity?: number;
  rotate?: number;
  scale?: number;
}

export const WatermarkLayer: React.FC<WatermarkLayerProps> = ({
  username = 'OnlyYours',
  enabled = true,
  opacity = 10,
  rotate = -35,
  scale = 125
}) => {
  if (!enabled) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden select-none z-10"
      style={{ opacity: opacity / 100 }}
    >
      <div 
        className="grid grid-cols-2 gap-20" 
        style={{ transform: `rotate(${rotate}deg) scale(${scale / 100})` }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span 
            key={i} 
            className={i % 2 === 0 ? "text-white text-2xl font-bold whitespace-nowrap" : "text-black text-2xl font-bold whitespace-nowrap"}
          >
            @{username}
          </span>
        ))}
      </div>
    </div>
  );
};
