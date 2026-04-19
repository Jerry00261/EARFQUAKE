import { memo, useEffect, useRef } from 'react';

const PADDING = 200;

// Continuous green → yellow → orange → red → dark red scale
const COLOR_STOPS = [
  { mag: 0, r: 74, g: 222, b: 128 },   // green
  { mag: 1.5, r: 160, g: 220, b: 80 }, // yellow-green
  { mag: 3, r: 250, g: 204, b: 21 },   // yellow
  { mag: 4.5, r: 245, g: 130, b: 32 }, // orange
  { mag: 6, r: 239, g: 68, b: 68 },    // red
  { mag: 7, r: 160, g: 20, b: 20 },    // dark red
];

function magToColor(mag) {
  if (mag <= COLOR_STOPS[0].mag) {
    const s = COLOR_STOPS[0];
    return `${s.r}, ${s.g}, ${s.b}`;
  }
  if (mag >= COLOR_STOPS[COLOR_STOPS.length - 1].mag) {
    const s = COLOR_STOPS[COLOR_STOPS.length - 1];
    return `${s.r}, ${s.g}, ${s.b}`;
  }
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (mag >= a.mag && mag <= b.mag) {
      const t = (mag - a.mag) / (b.mag - a.mag);
      const r = Math.round(a.r + (b.r - a.r) * t);
      const g = Math.round(a.g + (b.g - a.g) * t);
      const bl = Math.round(a.b + (b.b - a.b) * t);
      return `${r}, ${g}, ${bl}`;
    }
  }
  const s = COLOR_STOPS[COLOR_STOPS.length - 1];
  return `${s.r}, ${s.g}, ${s.b}`;
}

function AuraCanvas({
  hoveredId,
  map,
  overlay,
  earthquakes,
  selectedId,
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const latestStateRef = useRef({
    earthquakes,
    hoveredId,
    selectedId,
  });

  useEffect(() => {
    latestStateRef.current = {
      earthquakes,
      hoveredId,
      selectedId,
    };
  }, [earthquakes, hoveredId, selectedId]);

  useEffect(() => {
    if (!map || !overlay) {
      return undefined;
    }

    const panes = overlay.getPanes();
    if (!panes) {
      return undefined;
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    panes.overlayLayer.appendChild(canvas);
    canvasRef.current = canvas;

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    let disposed = false;

    const render = (timestamp) => {
      if (disposed) {
        return;
      }

      const projection = overlay.getProjection?.();

      if (!projection || !window.google?.maps) {
        animationFrameRef.current = window.requestAnimationFrame(render);
        return;
      }

      const bounds = map.getBounds();
      if (!bounds) {
        animationFrameRef.current = window.requestAnimationFrame(render);
        return;
      }

      const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest());
      const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());

      if (!sw || !ne) {
        animationFrameRef.current = window.requestAnimationFrame(render);
        return;
      }

      const left = Math.floor(sw.x) - PADDING;
      const top = Math.floor(ne.y) - PADDING;
      const width = Math.ceil(ne.x - sw.x) + PADDING * 2;
      const height = Math.ceil(sw.y - ne.y) + PADDING * 2;

      const pixelRatio = window.devicePixelRatio || 1;

      canvas.style.left = left + 'px';
      canvas.style.top = top + 'px';
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      const pxWidth = Math.round(width * pixelRatio);
      const pxHeight = Math.round(height * pixelRatio);

      if (canvas.width !== pxWidth || canvas.height !== pxHeight) {
        canvas.width = pxWidth;
        canvas.height = pxHeight;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';

      const state = latestStateRef.current;

      state.earthquakes.forEach((quake) => {
        const pixel = projection.fromLatLngToDivPixel(
          new window.google.maps.LatLng(quake.lat, quake.lng)
        );

        if (!pixel) {
          return;
        }

        const x = pixel.x - left;
        const y = pixel.y - top;

        if (x < -140 || y < -140 || x > width + 140 || y > height + 140) {
          return;
        }

        const isSelected = quake.id === state.selectedId;
        const isHovered = quake.id === state.hoveredId;
        const pulseCount = isSelected ? 4 : 3;
        const baseRadius = 3 + quake.mag * 1.75;
        const waveSpan = 18 + quake.mag * 12;
        const speed = 0.045 + quake.mag * 0.02;
        const alphaScale = isSelected ? 1.2 : isHovered ? 1.0 : 0.8;

        let tone;
        if (isSelected) {
          tone = '255, 255, 255';
        } else {
          tone = magToColor(quake.mag);
        }

        for (let index = 0; index < pulseCount; index += 1) {
          const progress = (timestamp * 0.001 * speed + index / pulseCount) % 1;
          const eased = 1 - (1 - progress) ** 3;
          const radius = baseRadius + waveSpan * eased * (isHovered ? 1.08 : 1);
          const opacity =
            ((1 - eased) ** 1.8 * (0.34 + quake.mag * 0.035) + 0.015) * alphaScale;

          context.beginPath();
          context.lineWidth = isSelected ? 2.4 : isHovered ? 2 : 1.4;
          context.strokeStyle = `rgba(${tone}, ${Math.min(opacity, 0.7)})`;
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.stroke();
        }

        context.beginPath();
        context.fillStyle = `rgba(${tone}, 0.85)`;
        context.arc(x, y, isSelected ? 5.5 : 4.2, 0, Math.PI * 2);
        context.fill();

        if (isSelected || isHovered) {
          context.beginPath();
          context.lineWidth = 1.6;
          context.strokeStyle = `rgba(${tone}, 0.7)`;
          context.arc(x, y, baseRadius + 8, 0, Math.PI * 2);
          context.stroke();
        }
      });

      context.globalCompositeOperation = 'source-over';
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameRef.current);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map, overlay]);

  return null;
}

export default memo(AuraCanvas);
