import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;
const BUTTON_ZOOM_STEP = 0.15;

export function usePanZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, scale: 1 });
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const stateAtDragStartRef = useRef<PanZoomState>({ x: 0, y: 0, scale: 1 });

  // Live transform ref — updated every frame WITHOUT triggering React re-render
  const liveRef = useRef<PanZoomState>({ x: 0, y: 0, scale: 1 });
  // RAF throttle ref
  const rafRef = useRef<number | null>(null);
  // Reference to the content element that receives the transform
  const contentElRef = useRef<HTMLElement | null>(null);

  // Touch-specific refs
  const lastTouchDistRef = useRef(0);
  const lastTouchCenterRef = useRef({ x: 0, y: 0 });
  const isTouchPanRef = useRef(false);

  const clampScale = (s: number) => Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);

  // Apply transform directly to DOM (no React re-render)
  const applyTransform = useCallback((t: PanZoomState) => {
    liveRef.current = t;
    // Find the content element (first child of container)
    const el = contentElRef.current ?? containerRef.current?.firstElementChild as HTMLElement;
    if (el) {
      contentElRef.current = el;
      el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
  }, [containerRef]);

  // Sync live ref → React state (call on gesture end)
  const syncState = useCallback(() => {
    setState({ ...liveRef.current });
  }, []);

  // Keep liveRef in sync when state changes from external sources (buttons, reset)
  useEffect(() => {
    liveRef.current = state;
  }, [state]);

  const handleZoomIn = useCallback(() => {
    const el = containerRef.current;
    const cx = el ? el.clientWidth / 2 : 0;
    const cy = el ? el.clientHeight / 2 : 0;
    setState((prev) => {
      const newScale = clampScale(prev.scale + BUTTON_ZOOM_STEP);
      const ratio = 1 - newScale / prev.scale;
      return {
        x: prev.x + (cx - prev.x) * ratio,
        y: prev.y + (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, [containerRef]);

  const handleZoomOut = useCallback(() => {
    const el = containerRef.current;
    const cx = el ? el.clientWidth / 2 : 0;
    const cy = el ? el.clientHeight / 2 : 0;
    setState((prev) => {
      const newScale = clampScale(prev.scale - BUTTON_ZOOM_STEP);
      const ratio = 1 - newScale / prev.scale;
      return {
        x: prev.x + (cx - prev.x) * ratio,
        y: prev.y + (cy - prev.y) * ratio,
        scale: newScale,
      };
    });
  }, [containerRef]);

  const handleResetZoom = useCallback(() => {
    setState({ x: 0, y: 0, scale: 1 });
  }, []);

  // ── Mouse wheel zoom at cursor position ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const prev = liveRef.current;
      const zoomFactor = 1 - e.deltaY * ZOOM_SENSITIVITY;
      const newScale = clampScale(prev.scale * zoomFactor);
      const ratio = 1 - newScale / prev.scale;
      const next = {
        x: prev.x + (cursorX - prev.x) * ratio,
        y: prev.y + (cursorY - prev.y) * ratio,
        scale: newScale,
      };
      applyTransform(next);
      // Debounce state sync for wheel
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        syncState();
      });
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [containerRef, applyTransform, syncState]);

  // ── Touch events for mobile (pan + pinch zoom) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger: start pan
        isTouchPanRef.current = true;
        hasDraggedRef.current = false;
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        stateAtDragStartRef.current = { ...liveRef.current };
      } else if (e.touches.length === 2) {
        // Two fingers: start pinch zoom
        e.preventDefault();
        isTouchPanRef.current = false;
        lastTouchDistRef.current = getTouchDistance(
          e.touches[0],
          e.touches[1],
        );
        lastTouchCenterRef.current = getTouchCenter(
          e.touches[0],
          e.touches[1],
        );
        stateAtDragStartRef.current = { ...liveRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isTouchPanRef.current) {
        // Single finger pan
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;

        if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          hasDraggedRef.current = true;
        }

        if (hasDraggedRef.current) {
          e.preventDefault();
          // Direct DOM update — no React re-render
          applyTransform({
            ...stateAtDragStartRef.current,
            x: stateAtDragStartRef.current.x + dx,
            y: stateAtDragStartRef.current.y + dy,
          });
        }
      } else if (e.touches.length === 2) {
        // Pinch zoom + pan
        e.preventDefault();
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const newCenter = getTouchCenter(e.touches[0], e.touches[1]);
        const rect = el.getBoundingClientRect();

        const scaleFactor = newDist / lastTouchDistRef.current;
        const prevCenter = lastTouchCenterRef.current;

        const prev = liveRef.current;
        const newScale = clampScale(prev.scale * scaleFactor);
        const cx = newCenter.x - rect.left;
        const cy = newCenter.y - rect.top;
        const ratio = 1 - newScale / prev.scale;
        const panDx = newCenter.x - prevCenter.x;
        const panDy = newCenter.y - prevCenter.y;

        // Direct DOM update — no React re-render
        applyTransform({
          x: prev.x + (cx - prev.x) * ratio + panDx,
          y: prev.y + (cy - prev.y) * ratio + panDy,
          scale: newScale,
        });

        lastTouchDistRef.current = newDist;
        lastTouchCenterRef.current = newCenter;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isTouchPanRef.current = false;
        // Sync React state on gesture end
        syncState();
        if (hasDraggedRef.current) {
          setTimeout(() => {
            hasDraggedRef.current = false;
          }, 100);
        }
      } else if (e.touches.length === 1) {
        // Went from 2 fingers to 1: restart single-finger pan
        isTouchPanRef.current = true;
        hasDraggedRef.current = false;
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        stateAtDragStartRef.current = { ...liveRef.current };
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [containerRef, applyTransform, syncState]);

  // ── Mouse Pan (desktop) ──
  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    setIsPressed(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    stateAtDragStartRef.current = { ...liveRef.current };
  };

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!isPressed) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true);
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      e.preventDefault();
      // Direct DOM update — no React re-render during drag
      applyTransform({
        ...stateAtDragStartRef.current,
        x: stateAtDragStartRef.current.x + dx,
        y: stateAtDragStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isPressed) {
      syncState(); // Sync React state on gesture end
    }
    setIsPressed(false);
    setIsDragging(false);
  };

  const handleClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  // Allow external control of the transform state (e.g. auto-center on mobile)
  const setTransform = useCallback((newState: PanZoomState) => {
    setState(newState);
    applyTransform(newState);
  }, [applyTransform]);

  return {
    scale: state.scale,
    transformStyle: {
      transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
      transformOrigin: "0 0",
      touchAction: "none",
    } as React.CSSProperties,
    isPressed,
    isDragging,
    setTransform,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  };
}
