import React, { useRef, useEffect, useState } from 'react';
import type { DesignElement } from '../../store/designStore';

interface ISIOverlayProps {
  element: DesignElement;
  isActive: boolean;
}

export const ISIOverlay: React.FC<ISIOverlayProps> = ({ element, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Calculate effective padding (individual sides override single value)
  const paddingTop = element.isiPaddingTop ?? element.isiPadding ?? 10;
  const paddingRight = element.isiPaddingRight ?? element.isiPadding ?? 10;
  const paddingBottom = element.isiPaddingBottom ?? element.isiPadding ?? 10;
  const paddingLeft = element.isiPaddingLeft ?? element.isiPadding ?? 10;

  // Calculate effective margin (individual sides override single value)
  const marginTop = element.isiMarginTop ?? element.isiMargin ?? 0;
  const marginLeft = element.isiMarginLeft ?? element.isiMargin ?? 0;

  // Apply margin to position
  const effectiveX = (element.x || 0) + marginLeft;
  const effectiveY = (element.y || 0) + marginTop;

  // Auto-scroll preview logic (matching ISIScroll.tsx)
  useEffect(() => {
    if (!isActive || !element.isiAutoStart) return;

    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = element.isiScrollSpeed || 30;

      if (contentRef.current && containerRef.current) {
        const headerHeight = element.isiHeaderText ? element.isiHeaderHeight || 20 : 0;
        const maxScroll = (contentRef.current.scrollHeight - headerHeight) - containerRef.current.clientHeight;
        setContentHeight(contentRef.current.scrollHeight - headerHeight);
        if (maxScroll > 0) {
          const currentScroll = (speed * elapsed) % (maxScroll + 2000); // 2s pause at end
          const actualScroll = Math.min(currentScroll, maxScroll);
          setScrollY(actualScroll);
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, element.isiAutoStart, element.isiScrollSpeed, element.isiText, element.isiHeaderText, element.isiHeaderHeight]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: effectiveX,
    top: effectiveY,
    width: element.width,
    height: element.height,
    backgroundColor: element.isiBackgroundColor || '#ffffff',
    color: element.fill || '#000000',
    fontSize: `${element.fontSize || 12}px`,
    fontFamily: element.isiFontFamily || 'Arial, Helvetica, sans-serif',
    fontWeight: element.isiFontWeight || 'normal',
    fontStyle: element.isiFontStyle || 'normal',
    lineHeight: element.isiLineHeight || 1.4,
    letterSpacing: `${element.isiLetterSpacing || 0}px`,
    border: `${element.isiBorderWidth || 0}px solid ${element.isiBorderColor || 'transparent'}`,
    overflow: 'hidden',
    pointerEvents: 'none', // Let users drag/edit elements underneath; links are re-enabled via CSS
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    cursor: 'default',
  };

  const scrollbarColor = element.isiScrollbarColor || '#006937';
  const indicatorColor = element.isiScrollbarTrackColor || '#f2f2f2';

  const headerText = element.isiHeaderText;
  const headerHeight = headerText ? element.isiHeaderHeight || 20 : 0;
  const bodyHeight = Math.max(0, (element.height || 200) - headerHeight);
  const maxScroll = contentHeight - bodyHeight;
  const logoWidth = element.isiLogoWidth || 187;

  return (
    <div ref={containerRef} style={style} className="isi-rich-overlay">
      {/* Traditional patient_link header strip */}
      {headerText && (
        <div className="patient_link">
          <p
            style={{
              fontSize: 10,
              padding: '3px 10px 5px',
              backgroundColor: element.isiHeaderBackground || '#E8FFF9',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontWeight: 'bold',
              margin: '5px 0 10px 0',
            }}
          >
            <a
              href={element.isiHeaderLink || '#'}
              target={element.isiHeaderLink ? '_blank' : undefined}
              rel="noopener noreferrer"
              style={{
                color: element.isiHeaderColor || '#000000',
                textDecoration: 'underline',
                textUnderlineOffset: 1,
                fontWeight: 'bold',
              }}
            >
              {headerText}
            </a>
          </p>
        </div>
      )}

      {/* Scrollable wrapper (mirrors .isi_wrapper) */}
      <div className="isi_wrapper" style={{ position: 'relative', height: bodyHeight, paddingRight: 10, overflow: 'hidden' }}>
        <div
          ref={contentRef}
          className="isi"
          style={{ 
            transform: `translateY(-${scrollY}px)`, 
            transition: 'transform 0.1s linear', 
            width: element.width ? element.width - 14 : 280,
            paddingTop: `${paddingTop}px`,
            paddingRight: `${paddingRight}px`,
            paddingBottom: `${paddingBottom}px`,
            paddingLeft: `${paddingLeft}px`,
            boxSizing: 'border-box'
          }}
        >
          {/* Logo Integration */}
          {element.isiLogoSrc && (element.isiLogoPosition || 'bottom') === 'top' && (
            element.isiLogoLink ? (
              <a href={element.isiLogoLink} target="_blank" rel="noopener noreferrer">
                <img
                  src={element.isiLogoSrc}
                  style={{ width: logoWidth, height: 'auto', display: 'block', marginBottom: 10, border: 0 }}
                />
              </a>
            ) : (
              <img
                src={element.isiLogoSrc}
                style={{ width: logoWidth, height: 'auto', display: 'block', marginBottom: 10 }}
              />
            )
          )}

          {/* Rich Text Content */}
          <div
            dangerouslySetInnerHTML={{ __html: element.isiText || '' }}
            className="rich-isi-content"
          />

          {/* Bottom logo (reference: .isi-logo, 187px wide, bottom of content) */}
          {element.isiLogoSrc && (element.isiLogoPosition || 'bottom') !== 'top' && (
            element.isiLogoLink ? (
              <a href={element.isiLogoLink} target="_blank" rel="noopener noreferrer">
                <img className="mb-10 isi-logo" src={element.isiLogoSrc} style={{ width: logoWidth, height: 'auto', border: 0 }} />
              </a>
            ) : (
              <img className="mb-10 isi-logo" src={element.isiLogoSrc} style={{ width: logoWidth, height: 'auto' }} />
            )
          )}
        </div>

        {/* iScroll-style scrollbar (green track + fixed 13px light indicator) */}
        <div
          className="iScrollVerticalScrollbar iScrollLoneScrollbar"
          style={{
            top: 0,
            right: element.isiScrollbarMarginRight ?? 3,
            height: `${element.isiScrollbarHeight ?? 66}%`,
            width: element.isiScrollbarWidth ?? 8,
            padding: element.isiScrollbarPadding ?? 0,
            marginTop: element.isiScrollbarMarginTop ?? 5,
            position: 'absolute',
            zIndex: 9999,
            overflow: 'visible',
            backgroundColor: scrollbarColor,
            borderRadius: 5,
            borderTop: `1px solid ${scrollbarColor}`,
            borderBottom: `1px solid ${scrollbarColor}`,
          }}
        >
          <div
            className="iScrollIndicator"
            style={{
              width: 6,
              height: 13,
              right: 1,
              position: 'absolute',
              background: indicatorColor,
              borderRadius: 5,
              top: `${Math.min(maxScroll > 0 ? (scrollY / maxScroll) * ((bodyHeight - 25) * 0.66 - 13) : 0, Math.max(0, (bodyHeight - 25) * 0.66 - 13))}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
