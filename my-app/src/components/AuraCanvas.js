import { memo, useEffect, useRef } from 'react';

function resizeCanvas(canvas, container) {
  const context = canvas.getContext('2d');
  const pixelRatio = window.devicePixelRatio || 1;
  const { width, height } = container.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function AuraCanvas({
  focusNearby,
  hoveredId,
  map,
  nearbyIds,
  overlay,
  earthquakes,
  selectedId,
  userPoint,
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const latestStateRef = useRef({
    earthquakes,
    focusNearby,
    hoveredId,
    nearbyIds,
    selectedId,
    userPoint,
  });

  useEffect(() => {
    latestStateRef.current = {
      earthquakes,
      focusNearby,
      hoveredId,
      nearbyIds,
      selectedId,
      userPoint,
    };
  }, [earthquakes, focusNearby, hoveredId, nearbyIds, selectedId, userPoint]);

  useEffect(() => {
    if (!map || !overlay || !canvasRef.current) {
      return undefined;
    }

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    const context = canvas.getContext('2d');

    if (!container || !context) {
      return undefined;
    }

    resizeCanvas(canvas, container);

    const resizeObserver = new ResizeObserver(() => resizeCanvas(canvas, container));
    resizeObserver.observe(container);

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

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      const state = latestStateRef.current;

      state.earthquakes.forEach((quake) => {
        const pixel = projection.fromLatLngToDivPixel(
          new window.google.maps.LatLng(quake.lat, quake.lng)
        );

        if (!pixel) {
          return;
        }

        const x = pixel.x;
        const y = pixel.y;

        if (x < -140 || y < -140 || x > width + 140 || y > height + 140) {
          return;
        }

        const isSelected = quake.id === state.selectedId;
        const isHovered = quake.id === state.hoveredId;
        const isNearby = state.nearbyIds.has(quake.id);
        const dimmed = state.focusNearby && state.userPoint && !isNearby;
        const pulseCount = isSelected ? 4 : 3;
        const baseRadius = 3 + quake.mag * 1.75;
        const waveSpan = 26 + quake.mag * 19;
        const speed = 0.12 + quake.mag * 0.055;
        const alphaScale = dimmed ? 0.18 : isSelected ? 1.35 : isHovered ? 1.2 : 1;
        const tone = isSelected
          ? '255, 150, 88'
          : isNearby
            ? '94, 230, 210'
            : '127, 214, 255';

        for (let index = 0; index < pulseCount; index += 1) {
          const progress = (timestamp * 0.001 * speed + index / pulseCount) % 1;
          const eased = 1 - (1 - progress) ** 3;
          const radius = baseRadius + waveSpan * eased * (isHovered ? 1.08 : 1);
          const opacity =
            ((1 - eased) ** 1.8 * (0.34 + quake.mag * 0.035) + 0.015) * alphaScale;

          context.beginPath();
          context.lineWidth = isSelected ? 2.4 : isHovered ? 2 : 1.4;
          context.strokeStyle = `rgba(${tone}, ${Math.min(opacity, 0.9)})`;
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.stroke();
        }

        context.beginPath();
        context.fillStyle = `rgba(${tone}, ${dimmed ? 0.22 : 0.92})`;
        context.arc(x, y, isSelected ? 5.5 : 4.2, 0, Math.PI * 2);
        context.fill();

        if (isSelected || isHovered) {
          context.beginPath();
          context.lineWidth = 1.6;
          context.strokeStyle = `rgba(${tone}, ${dimmed ? 0.3 : 0.9})`;
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
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrameRef.current);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [map, overlay]);

  return <canvas aria-hidden="true" className="aura-canvas" ref={canvasRef} />;
}

export default memo(AuraCanvas);
