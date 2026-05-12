// src/components/SectionHero.jsx
// Blueprint illustration component with smooth transitions & preload
import { useState, useEffect } from 'react';
import { getSectionGraphic } from '../config/sectionGraphics';

// Кэш для preload изображений
const imageCache = new Set();

export function SectionHero({ sectionId, height = 'auto', className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const graphic = getSectionGraphic(sectionId);

  if (!graphic) return null;

  const imgSrc = error && graphic.fallback ? graphic.fallback : graphic.image;

  // Preload следующего изображения
  useEffect(() => {
    setIsTransitioning(true);
    setLoaded(false);
    
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      setLoaded(true);
      setIsTransitioning(false);
      imageCache.add(imgSrc);
    };
    img.onerror = () => {
      if (!error && graphic.fallback) {
        setError(true);
      } else {
        setIsTransitioning(false);
      }
    };

    return () => {
      // Cleanup если компонент размонтировался до загрузки
      img.onload = null;
      img.onerror = null;
    };
  }, [imgSrc, error, graphic.fallback]);

  // Preload соседних секций (оптимизация)
  useEffect(() => {
    const allSections = Object.keys(getSectionGraphic);
    const currentIndex = allSections.indexOf(sectionId);
        // Preload следующей и предыдущей секции
    const neighbors = [
      allSections[(currentIndex + 1) % allSections.length],
      allSections[(currentIndex - 1 + allSections.length) % allSections.length]
    ];

    neighbors.forEach(section => {
      const neighborGraphic = getSectionGraphic(section);
      if (neighborGraphic && !imageCache.has(neighborGraphic.image)) {
        const preloadImg = new Image();
        preloadImg.src = neighborGraphic.image;
        imageCache.add(neighborGraphic.image);
      }
    });
  }, [sectionId]);

  return (
    <div
      className={`section-illustration ${className}`}
      style={{
        position: 'relative',
        marginBottom: 14,
        border: '1.5px solid rgba(0,112,192,0.2)',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#f5f0e1',
        boxShadow: '0 2px 10px rgba(0,112,192,0.08)',
        minHeight: loaded ? 'auto' : 120,
        opacity: isTransitioning ? 0.6 : 1,
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        transform: isTransitioning ? 'scale(0.995)' : 'scale(1)',
      }}
    >
      {/* Угловые декоры как на чертежах */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Уголки */}
        <polyline points="4,12 4,4 12,4"     fill="none" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8"/>
        <polyline points="88,4 96,4 96,12"   fill="none" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8"/>
        <polyline points="4,88 4,96 12,96"   fill="none" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8"/>
        <polyline points="88,96 96,96 96,88" fill="none" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8"/>
        {/* Центральные перекрестия */}
        <line x1="0" y1="50" x2="4" y2="50" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>
        <line x1="96" y1="50" x2="100" y2="50" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>
      </svg>

      {/* Скелетон пока не загружено */}      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, #f5f0e1 0%, #f0ead6 100%)',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: 2,
            color: 'rgba(0,112,192,0.3)',
            textTransform: 'uppercase',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>Loading · {graphic.caption}</div>
        </div>
      )}

      {/* Основное изображение */}
      <img
        src={imgSrc}
        alt={graphic.alt}
        style={{
          width: '100%',
          height: height === 'auto' ? 'auto' : height,
          objectFit: height === 'auto' ? 'contain' : 'cover',
          display: 'block',
          mixBlendMode: 'multiply',
          opacity: loaded ? 0.92 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Подпись в стиле чертежа */}
      {loaded && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '4px 10px',
          background: 'linear-gradient(transparent, rgba(245,240,225,0.96))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 3,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7.5, letterSpacing: 1.5,
            color: 'rgba(0,112,192,0.65)',
            textTransform: 'uppercase',
          }}>
            {graphic.caption}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",            fontSize: 7, letterSpacing: 1,
            color: 'rgba(200,164,90,0.7)',
          }}>
            {graphic.scale}
          </span>
        </div>
      )}
    </div>
  );
}
